-- ROLLBACK for 20260927000200_af05_role_normalisation.sql
-- Reverses D1. NOTE: the admin/group_leader distinction is collapsed on the way
-- in (both -> moderator), so on the way back moderator maps to 'admin' (the
-- lossy-but-safe choice; group_leader was already authorisation-identical).
-- The function bodies are restored to their pre-D1 definitions.

-- 1. Reverse-map data.
update public.conversation_members
  set role = 'admin'
  where role = 'moderator';

-- 2. Restore the original check constraint.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.conversation_members'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.conversation_members drop constraint %I', c.conname);
  end loop;

  alter table public.conversation_members
    add constraint conversation_members_role_check
    check (role in ('member', 'admin', 'owner', 'group_leader'));
end;
$$;

-- 3. user_can_manage_conversation — original vocabulary.
create or replace function public.user_can_manage_conversation(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id::text = public.request_user_id()
      and role in ('owner', 'admin', 'group_leader')
      and left_at is null
  );
$function$;

-- 4. can_insert_conversation_member — original vocabulary.
create or replace function public.can_insert_conversation_member(
  target_user_id text,
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    target_user_id = public.request_user_id()
    or exists (
      select 1 from public.user_profiles
      where user_id::text = public.request_user_id()
        and role in ('admin', 'super_admin')
    )
    or exists (
      select 1 from public.conversation_members
      where conversation_id = target_conversation_id
        and user_id::text = public.request_user_id()
        and role in ('owner', 'admin', 'group_leader')
        and left_at is null
    ),
    false);
$function$;

-- 5. fn_assign_admin_with_rules — default role back to 'admin'.
create or replace function public.fn_assign_admin_with_rules(
  p_conversation_id uuid, p_user_id text, p_role text default 'admin'::text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.role() <> 'service_role' and not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  update conversations
    set last_message_at = now(), last_message_preview = 'System: Rules of Conduct updated'
    where id = p_conversation_id;

  if not found then
    raise exception 'Conversation % not found', p_conversation_id;
  end if;

  insert into messages (conversation_id, sender_id, content, message_type)
  values (
    p_conversation_id, p_user_id,
    E'RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to group\'s subject matter.\n4. Protect your privacy and others\'.',
    'system'
  );

  insert into conversation_members (conversation_id, user_id, role, joined_at)
  values (p_conversation_id, p_user_id, p_role, now())
  on conflict (conversation_id, user_id)
  do update set role = excluded.role, joined_at = now(), left_at = null;
end;
$function$;

revoke all on function public.fn_assign_admin_with_rules(uuid, text, text) from public, anon, authenticated;
grant execute on function public.fn_assign_admin_with_rules(uuid, text, text) to service_role;

-- 6. fn_make_group_leader — back to the 20260817 chat-scoped definition.
create or replace function public.fn_make_group_leader(p_conversation_id uuid, p_user_id uuid, p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_existing_leader uuid;
begin
  if auth.role() <> 'service_role' and not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  select user_id into v_existing_leader
  from conversation_members
  where conversation_id = p_conversation_id and role = 'group_leader' and left_at is null
  limit 1;

  if v_existing_leader is not null then
    raise exception 'This conversation already has a group leader.';
  end if;

  insert into conversation_members (conversation_id, user_id, role, joined_at, left_at)
  values (p_conversation_id, p_user_id, 'group_leader', now(), null)
  on conflict (conversation_id, user_id) do update set role = 'group_leader', left_at = null, joined_at = now();

  update conversations
  set last_message_at = now(), last_message_preview = 'System: Rules of Conduct updated'
  where id = p_conversation_id;

  insert into messages (conversation_id, sender_id, content, message_type)
  values (p_conversation_id, p_user_id,
    'RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to health.\n4. Protect your privacy and others.',
    'system');

  insert into facility_conversations (facility_id, conversation_id)
  values (p_facility_id, p_conversation_id)
  on conflict (facility_id, conversation_id) do nothing;
end;
$function$;

revoke all on function public.fn_make_group_leader(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_make_group_leader(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
