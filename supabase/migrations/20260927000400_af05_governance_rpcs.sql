-- =============================================================================
-- AF-05 Phase B — Group governance RPCs
-- =============================================================================
-- SECURITY DEFINER, authorised in-DB via request_user_id() +
-- user_can_manage_conversation() / is_app_admin(), so they are safe to call
-- DIRECTLY from the mobile app with the end-user's JWT (same pattern as
-- report_chat_content) — this keeps authorisation in the database instead of
-- relying on the RLS-bypassing service-role BFF (drift point G7).
--
-- Notifications go through dispatch_notification_async (single unambiguous
-- signature, non-blocking — the same primitive the fn_on_new_message trigger
-- uses). Governance RPCs deliberately do NOT insert 'system' messages, because
-- fn_on_new_message does not exclude message_type='system' and would push-notify
-- the entire group on every join. Targeted notifications are dispatched instead.
--
-- Roles use the D1 vocabulary: managers are 'owner' + 'moderator'.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_invite_to_conversation — a moderator/owner (or platform admin) invites a
-- user. Upserts the pending invitation and notifies the invitee.
-- -----------------------------------------------------------------------------
create or replace function public.fn_invite_to_conversation(
  p_conversation_id uuid,
  p_invited_user_id uuid,
  p_role text default 'member',
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_type text;
  v_deleted boolean;
  v_group_name text;
  v_inviter_name text;
  v_inv_id uuid;
  v_recipients jsonb;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if not (public.user_can_manage_conversation(p_conversation_id) or public.is_app_admin()) then
    raise exception 'Not authorized to invite to this group';
  end if;
  if p_role is null or p_role not in ('member', 'moderator') then
    p_role := 'member';
  end if;

  select c.type, c.is_deleted, coalesce(nullif(trim(c.name), ''), nullif(trim(c.group_name), ''), 'Group')
    into v_type, v_deleted, v_group_name
  from public.conversations c where c.id = p_conversation_id;
  if v_type is null or v_deleted or v_type <> 'group' then
    raise exception 'Group not found';
  end if;

  if exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_invited_user_id and left_at is null
  ) then
    raise exception 'User is already a member of this group';
  end if;

  select nullif(trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')), '')
    into v_inviter_name from public.user_profiles up where up.user_id = v_me;
  v_inviter_name := coalesce(v_inviter_name, 'A moderator');

  select id into v_inv_id from public.conversation_invitations
    where conversation_id = p_conversation_id and invited_user_id = p_invited_user_id and status = 'pending'
    limit 1;
  if v_inv_id is not null then
    update public.conversation_invitations
      set role = p_role, message = p_message, invited_by = v_me, created_at = now()
      where id = v_inv_id;
  else
    insert into public.conversation_invitations (conversation_id, invited_user_id, invited_by, role, message)
    values (p_conversation_id, p_invited_user_id, v_me, p_role, p_message)
    returning id into v_inv_id;
  end if;

  v_recipients := jsonb_build_array(jsonb_build_object(
    'user_id', p_invited_user_id,
    'title', 'Group invitation',
    'body', v_inviter_name || ' invited you to join ' || v_group_name,
    'type', 'group_invite',
    'channel_id', 'chat-messages',
    'metadata', jsonb_build_object(
      'conversation_id', p_conversation_id,
      'invitation_id', v_inv_id,
      'group_name', v_group_name,
      'inviter_name', v_inviter_name
    )
  ));
  perform public.dispatch_notification_async(v_recipients);

  return jsonb_build_object('ok', true, 'invitation_id', v_inv_id);
end;
$fn$;

-- -----------------------------------------------------------------------------
-- fn_respond_invitation — the invited user accepts or declines.
-- On accept: inserts membership (capacity-checked) and marks accepted.
-- -----------------------------------------------------------------------------
create or replace function public.fn_respond_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_inv public.conversation_invitations%rowtype;
  v_member_count int;
  v_max int;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv from public.conversation_invitations where id = p_invitation_id;
  if v_inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if v_inv.invited_user_id <> v_me then
    raise exception 'Not authorized to respond to this invitation';
  end if;
  if v_inv.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', v_inv.status, 'already_responded', true);
  end if;

  if not p_accept then
    update public.conversation_invitations
      set status = 'declined', responded_at = now() where id = p_invitation_id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;

  select coalesce(c.max_members, 500) into v_max from public.conversations c where c.id = v_inv.conversation_id;
  select count(*) into v_member_count from public.conversation_members
    where conversation_id = v_inv.conversation_id and left_at is null;
  if v_member_count >= v_max then
    raise exception 'This group is full.';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role, joined_at, left_at)
  values (v_inv.conversation_id, v_me, coalesce(v_inv.role, 'member'), now(), null)
  on conflict (conversation_id, user_id)
  do update set role = excluded.role, left_at = null, joined_at = now();

  update public.conversation_invitations
    set status = 'accepted', responded_at = now() where id = p_invitation_id;

  return jsonb_build_object('ok', true, 'status', 'accepted', 'conversation_id', v_inv.conversation_id);
end;
$fn$;

-- -----------------------------------------------------------------------------
-- fn_request_join — a user asks to join a group that needs approval
-- (approval_required / restricted). Creates a pending join request + notifies
-- the group's managers.
-- -----------------------------------------------------------------------------
create or replace function public.fn_request_join(
  p_conversation_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_type text;
  v_deleted boolean;
  v_group_name text;
  v_requester_name text;
  v_req_id uuid;
  v_recipients jsonb;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select c.type, c.is_deleted, coalesce(nullif(trim(c.name), ''), nullif(trim(c.group_name), ''), 'Group')
    into v_type, v_deleted, v_group_name
  from public.conversations c where c.id = p_conversation_id;
  if v_type is null or v_deleted or v_type <> 'group' then
    raise exception 'Group not found';
  end if;

  if exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = v_me and left_at is null
  ) then
    return jsonb_build_object('ok', true, 'already_member', true);
  end if;

  select id into v_req_id from public.conversation_join_requests
    where conversation_id = p_conversation_id and user_id = v_me and status = 'pending' limit 1;
  if v_req_id is not null then
    return jsonb_build_object('ok', true, 'request_id', v_req_id, 'duplicate', true);
  end if;

  insert into public.conversation_join_requests (conversation_id, user_id, requested_by, reason)
  values (p_conversation_id, v_me, v_me, p_message)
  returning id into v_req_id;

  select nullif(trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')), '')
    into v_requester_name from public.user_profiles up where up.user_id = v_me;
  v_requester_name := coalesce(v_requester_name, 'Someone');

  select jsonb_agg(jsonb_build_object(
    'user_id', cm.user_id,
    'title', 'New join request',
    'body', v_requester_name || ' requested to join ' || v_group_name,
    'type', 'group_join_request',
    'channel_id', 'chat-messages',
    'metadata', jsonb_build_object(
      'conversation_id', p_conversation_id,
      'request_id', v_req_id,
      'group_name', v_group_name,
      'requester_name', v_requester_name
    )
  )) into v_recipients
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id
    and cm.left_at is null
    and cm.role in ('owner', 'moderator');

  if v_recipients is not null then
    perform public.dispatch_notification_async(v_recipients);
  end if;

  return jsonb_build_object('ok', true, 'request_id', v_req_id);
end;
$fn$;

-- -----------------------------------------------------------------------------
-- fn_request_add_member — a member tries to add someone into a group.
-- Managers add directly; ordinary members create a pending join request that a
-- moderator must approve (the "restricted group" rule).
-- -----------------------------------------------------------------------------
create or replace function public.fn_request_add_member(
  p_conversation_id uuid,
  p_user_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_is_manager boolean;
  v_member_count int;
  v_max int;
  v_req_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_conversation_member(p_conversation_id) and not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;
  if p_user_id = v_me then
    raise exception 'Use fn_request_join to add yourself';
  end if;
  if exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_user_id and left_at is null
  ) then
    return jsonb_build_object('ok', true, 'already_member', true);
  end if;

  v_is_manager := public.user_can_manage_conversation(p_conversation_id) or public.is_app_admin();

  if v_is_manager then
    select coalesce(c.max_members, 500) into v_max from public.conversations c where c.id = p_conversation_id;
    select count(*) into v_member_count from public.conversation_members
      where conversation_id = p_conversation_id and left_at is null;
    if v_member_count >= v_max then
      raise exception 'This group is full.';
    end if;
    insert into public.conversation_members (conversation_id, user_id, role, joined_at, left_at)
    values (p_conversation_id, p_user_id, 'member', now(), null)
    on conflict (conversation_id, user_id) do update set left_at = null, joined_at = now();
    return jsonb_build_object('ok', true, 'added', true);
  end if;

  -- Ordinary member in a restricted/approval group -> pending request.
  select id into v_req_id from public.conversation_join_requests
    where conversation_id = p_conversation_id and user_id = p_user_id and status = 'pending' limit 1;
  if v_req_id is not null then
    return jsonb_build_object('ok', true, 'request_id', v_req_id, 'duplicate', true);
  end if;
  insert into public.conversation_join_requests (conversation_id, user_id, requested_by, reason)
  values (p_conversation_id, p_user_id, v_me, p_message)
  returning id into v_req_id;
  return jsonb_build_object('ok', true, 'request_id', v_req_id, 'pending_approval', true);
end;
$fn$;

-- -----------------------------------------------------------------------------
-- fn_review_join_request — a moderator/owner approves or rejects a request.
-- -----------------------------------------------------------------------------
create or replace function public.fn_review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_req public.conversation_join_requests%rowtype;
  v_member_count int;
  v_max int;
  v_group_name text;
  v_recipients jsonb;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_req from public.conversation_join_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'Join request not found';
  end if;
  if not (public.user_can_manage_conversation(v_req.conversation_id) or public.is_app_admin()) then
    raise exception 'Not authorized to review this request';
  end if;
  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', v_req.status, 'already_reviewed', true);
  end if;

  select coalesce(nullif(trim(c.name), ''), nullif(trim(c.group_name), ''), 'Group')
    into v_group_name from public.conversations c where c.id = v_req.conversation_id;

  if not p_approve then
    update public.conversation_join_requests
      set status = 'rejected', reviewed_by = v_me, reviewed_at = now(), reason = coalesce(p_reason, v_req.reason)
      where id = p_request_id;
    v_recipients := jsonb_build_array(jsonb_build_object(
      'user_id', v_req.user_id, 'title', 'Request declined',
      'body', 'Your request to join ' || v_group_name || ' was not approved',
      'type', 'group_join_request', 'channel_id', 'chat-messages',
      'metadata', jsonb_build_object('conversation_id', v_req.conversation_id, 'request_id', p_request_id, 'status', 'rejected')
    ));
    perform public.dispatch_notification_async(v_recipients);
    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;

  select coalesce(c.max_members, 500) into v_max from public.conversations c where c.id = v_req.conversation_id;
  select count(*) into v_member_count from public.conversation_members
    where conversation_id = v_req.conversation_id and left_at is null;
  if v_member_count >= v_max then
    raise exception 'This group is full.';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role, joined_at, left_at)
  values (v_req.conversation_id, v_req.user_id, 'member', now(), null)
  on conflict (conversation_id, user_id) do update set left_at = null, joined_at = now();

  update public.conversation_join_requests
    set status = 'approved', reviewed_by = v_me, reviewed_at = now(), reason = coalesce(p_reason, v_req.reason)
    where id = p_request_id;

  v_recipients := jsonb_build_array(jsonb_build_object(
    'user_id', v_req.user_id, 'title', 'Request approved',
    'body', 'You are now a member of ' || v_group_name,
    'type', 'group_chat', 'channel_id', 'chat-messages',
    'metadata', jsonb_build_object('conversation_id', v_req.conversation_id, 'request_id', p_request_id, 'status', 'approved')
  ));
  perform public.dispatch_notification_async(v_recipients);

  return jsonb_build_object('ok', true, 'status', 'approved', 'conversation_id', v_req.conversation_id);
end;
$fn$;

-- -----------------------------------------------------------------------------
-- fn_set_group_avatar — a moderator/owner (or platform admin) sets the group
-- image/icon. Writes conversations.avatar_url (the column already existed but
-- had no picker). Storage upload happens client-side; this persists the path.
-- -----------------------------------------------------------------------------
create or replace function public.fn_set_group_avatar(
  p_conversation_id uuid,
  p_avatar_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me uuid := nullif(public.request_user_id(), '')::uuid;
  v_type text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if not (public.user_can_manage_conversation(p_conversation_id) or public.is_app_admin()) then
    raise exception 'Not authorized to change this group';
  end if;

  select c.type into v_type from public.conversations c where c.id = p_conversation_id;
  if v_type is null or v_type <> 'group' then
    raise exception 'Group not found';
  end if;

  update public.conversations
    set avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''), updated_at = now()
    where id = p_conversation_id;

  return jsonb_build_object('ok', true, 'avatar_url', p_avatar_url);
end;
$fn$;

-- Grants: callable by the end user's JWT (mobile) and by the service-role BFF.
revoke all on function public.fn_invite_to_conversation(uuid, uuid, text, text) from public, anon;
revoke all on function public.fn_respond_invitation(uuid, boolean) from public, anon;
revoke all on function public.fn_request_join(uuid, text) from public, anon;
revoke all on function public.fn_request_add_member(uuid, uuid, text) from public, anon;
revoke all on function public.fn_review_join_request(uuid, boolean, text) from public, anon;
revoke all on function public.fn_set_group_avatar(uuid, text) from public, anon;

grant execute on function public.fn_invite_to_conversation(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.fn_respond_invitation(uuid, boolean) to authenticated, service_role;
grant execute on function public.fn_request_join(uuid, text) to authenticated, service_role;
grant execute on function public.fn_request_add_member(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.fn_review_join_request(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.fn_set_group_avatar(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
