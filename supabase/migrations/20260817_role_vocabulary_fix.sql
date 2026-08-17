-- =============================================================================
-- Role vocabulary unification (RBAC rollout, 2026-08-17)
--
-- Two historical leaks are closed here:
--
--   1. handle_new_user() accepted 'admin' / 'super_admin' / 'group_leader' /
--      'registrar' straight from raw_user_meta_data at signup — anyone who
--      signed up with role: "super_admin" in their metadata could mint a
--      super-admin account. Signups now always create role = 'user';
--      platform roles are granted only by existing admins (invitations /
--      user_profiles updates).
--
--   2. fn_make_group_leader() stamped the GLOBAL user_profiles.role of a
--      chat group leader with 'group_leader'. That role is chat-scoped
--      (conversation_members.role) and must never appear on
--      user_profiles.role. The stamping line is removed; the
--      conversation_members behaviour is unchanged.
--
-- Legacy data: any user_profiles rows still carrying role = 'group_leader'
-- from past promotions are NOT mutated automatically. Review them with:
--
--   SELECT user_id, first_name, last_name FROM user_profiles WHERE role = 'group_leader';
--
-- then, if appropriate, run:
--
--   UPDATE user_profiles SET role = 'user' WHERE role = 'group_leader';
--
-- (or 'registrar' for staff who should keep data-entry access).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. handle_new_user: hard-locked to role = 'user' on signup.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    user_id,
    first_name,
    last_name,
    phone_number,
    sex,
    dob,
    role,
    user_type,
    status
  )
  values (
    new.id::text,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''),  ''),
    coalesce(nullif(new.raw_user_meta_data->>'phone_number', ''), ''),
    nullif(new.raw_user_meta_data->>'sex', ''),
    nullif(new.raw_user_meta_data->>'dob', ''),
    -- Role is ALWAYS 'user' at signup regardless of metadata: platform admin
    -- roles can only be granted by an existing admin after the fact.
    'user',
    coalesce(nullif(new.raw_user_meta_data->>'user_type', ''), 'customer'),
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. fn_make_group_leader: chat-scoped promotion only, no global role write.
-- -----------------------------------------------------------------------------
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

  -- Intentionally NO user_profiles.role write: group leadership is
  -- chat-scoped (conversation_members.role) and must not leak into the
  -- platform role vocabulary.
end;
$function$;
