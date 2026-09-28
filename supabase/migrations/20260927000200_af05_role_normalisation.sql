-- =============================================================================
-- AF-05 D1 — Conversation role normalisation: two-tier `owner` + `moderator`
-- =============================================================================
-- Decision D1: `admin` and `group_leader` (in conversation_members.role) are
-- authorisation-identical and are merged into ONE labelled `moderator`. `owner`
-- is retained as a thin super-moderator tier (ownership transfer + creator
-- immunity). `member` is unchanged.
--
-- SAFETY — expand/contract (parallel change), NOT a hard swap:
--   * EXPAND the check constraint to also allow 'moderator' (legacy values stay
--     legal so an in-flight old mobile/admin build writing 'admin'/'group_leader'
--     never hits a constraint violation mid-deploy).
--   * NORMALISE existing rows admin/group_leader -> moderator.
--   * Manager checks accept 'moderator' AND the legacy values (belt-and-braces
--     during the transition window).
--   * Every writer is repointed at 'moderator' (see code changes in the same
--     pass: membership.ts, ViewGroupDialog, conversation.actions.ts,
--     fn_assign_admin_with_rules, fn_make_group_leader).
--   * CONTRACT (dropping 'admin'/'group_leader' from the constraint) is a
--     DEFERRED follow-up, run only once no build in the wild writes them.
--
-- NOTE: this migration only touches conversation_members.role (chat-scoped).
-- It deliberately does NOT touch user_profiles.role, where a legacy
-- 'group_leader' global value is a separate concern (see 20260817_role_vocabulary_fix.sql).
-- =============================================================================

-- 1. EXPAND the role check constraint (robust to an unknown live constraint
--    name: the chat tables pre-existed the repo, so the auto-generated name may
--    differ from `conversation_members_role_check`).
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
    check (role in ('member', 'moderator', 'owner', 'admin', 'group_leader'));
end;
$$;

-- 2. NORMALISE existing rows.
update public.conversation_members
  set role = 'moderator'
  where role in ('admin', 'group_leader');

-- 3. user_can_manage_conversation — accept moderator (+ legacy during transition).
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
      and role in ('owner', 'moderator', 'admin', 'group_leader')
      and left_at is null
  );
$function$;

-- 4. can_insert_conversation_member — keep in step with the manager vocabulary.
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
        and role in ('owner', 'moderator', 'admin', 'group_leader')
        and left_at is null
    ),
    false);
$function$;

-- 5. fn_assign_admin_with_rules — default role becomes 'moderator'.
create or replace function public.fn_assign_admin_with_rules(
  p_conversation_id uuid, p_user_id text, p_role text default 'moderator'::text
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

-- 6. fn_make_group_leader — now promotes to the canonical 'moderator' role.
--    Function name kept (callers depend on it); the value it writes changes.
create or replace function public.fn_make_group_leader(
  p_conversation_id uuid, p_user_id uuid, p_facility_id uuid
)
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

  -- Single-leader guard, preserved from the prior definition; 'group_leader'
  -- is now spelled 'moderator' (D1). The legacy value stays in the check so an
  -- un-normalised row still trips the guard during the transition window.
  select user_id into v_existing_leader
  from conversation_members
  where conversation_id = p_conversation_id
    and role in ('moderator', 'group_leader')
    and left_at is null
  limit 1;

  if v_existing_leader is not null then
    raise exception 'This conversation already has a group leader.';
  end if;

  insert into conversation_members (conversation_id, user_id, role, joined_at, left_at)
  values (p_conversation_id, p_user_id, 'moderator', now(), null)
  on conflict (conversation_id, user_id) do update set role = 'moderator', left_at = null, joined_at = now();

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

  -- Intentionally NO user_profiles.role write: group leadership is chat-scoped
  -- (conversation_members.role) and must not leak into the platform role
  -- vocabulary (see 20260817_role_vocabulary_fix.sql).
end;
$function$;

revoke all on function public.fn_make_group_leader(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_make_group_leader(uuid, uuid, uuid) to service_role;

-- Reload PostgREST so the changed function signatures/defaults are picked up.
notify pgrst, 'reload schema';
