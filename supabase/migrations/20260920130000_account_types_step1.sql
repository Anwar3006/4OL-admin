-- ============================================================================
-- P0-05 step 1 · account_types (additive) — PLAN.md P0-05, decisions D5/D6
-- ============================================================================
--
-- Adds user_profiles.account_types text[] ⊆ {member, provider, partner} and
-- keeps the old user_type column in two-way sync with it, so every existing
-- reader and writer (admin console, mobile builds in the stores, DB
-- functions) keeps working unchanged while code moves over.
--
--   account_types           user_type (mirror)
--   {member}            ↔   customer
--   {provider}          ↔   business_provider   (legacy facility_owner → {provider})
--   {member,provider}   ↔   both
--
-- Step 2 (20260920140000_account_types_step2_finalize.sql, NOT applied here)
-- turns user_type into a read-only generated column and drops admin_role,
-- is_admin and admin_permissions — only after the admin-console code that
-- still WRITES user_type is deployed.
--
-- Security changes in this step:
--   * handle_new_user() no longer trusts user-editable signup metadata for the
--     account type. It reads raw_app_meta_data->'account_types', which only
--     the service role can set (auth.admin.createUser). Public sign-ups are
--     always {member}. Before this, anyone could sign up with
--     user_metadata.user_type = 'business_provider'.
--   * Non-admin clients can't change their own account_types (added to
--     protect_user_profile_columns) or insert a profile row with anything
--     other than role 'user' / {member}.
--   * role must be 'user' or a row in admin_platform_roles.
-- ============================================================================

-- ── 1. Column, backfill, constraint, index ─────────────────────────────────
alter table public.user_profiles add column if not exists account_types text[];

update public.user_profiles set account_types = case
    when user_type in ('facility_owner', 'business_provider') then '{provider}'::text[]
    when user_type = 'both' then '{member,provider}'::text[]
    else '{member}'::text[]
  end
where account_types is null;

alter table public.user_profiles
  alter column account_types set default '{member}'::text[],
  alter column account_types set not null;

alter table public.user_profiles
  add constraint user_profiles_account_types_chk
  check (cardinality(account_types) >= 1
         and account_types <@ array['member', 'provider', 'partner']::text[]);

create index if not exists user_profiles_account_types_gin
  on public.user_profiles using gin (account_types);

-- normalise the mirror for rows whose user_type was off-vocabulary
update public.user_profiles set user_type = case
    when account_types @> array['member','provider']::text[] then 'both'
    when 'provider' = any(account_types) then 'business_provider'
    else 'customer'
  end
where user_type is distinct from case
    when account_types @> array['member','provider']::text[] then 'both'
    when 'provider' = any(account_types) then 'business_provider'
    else 'customer'
  end;

-- ── 2. role: fold admin_role in, then NOT NULL ──────────────────────────────
update public.user_profiles set role = case admin_role::text
    when 'support' then 'support_agent'
    when 'viewer' then 'analyst'
    else admin_role::text end
where role = 'user' and admin_role is not null
  and (case admin_role::text when 'support' then 'support_agent' when 'viewer' then 'analyst'
       else admin_role::text end) in (select r.role from public.admin_platform_roles r);

update public.user_profiles set role = 'user' where role is null;
alter table public.user_profiles
  alter column role set default 'user',
  alter column role set not null;

-- ── 3. Helpers ──────────────────────────────────────────────────────────────
create or replace function public.user_type_for_account_types(p text[])
returns text language sql immutable set search_path = public as $$
  select case
    when p @> array['member','provider']::text[] then 'both'
    when 'provider' = any(p) then 'business_provider'
    else 'customer' end
$$;

create or replace function public.account_types_for_user_type(p text)
returns text[] language sql immutable set search_path = public as $$
  select case
    when p in ('facility_owner', 'business_provider') then '{provider}'::text[]
    when p = 'both' then '{member,provider}'::text[]
    else '{member}'::text[] end
$$;

-- ── 4. Two-way sync + insert guard ─────────────────────────────────────────
create or replace function public.sync_account_types()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_client boolean := current_user in ('authenticated', 'anon');
  v_privileged boolean;
begin
  v_privileged := not v_client or coalesce((select public.is_admin()), false);

  if tg_op = 'INSERT' then
    new.account_types := coalesce(new.account_types, '{member}'::text[]);

    if not v_privileged then
      -- A client creating its own profile row gets the defaults, nothing else.
      if coalesce(new.role, 'user') <> 'user'
         or new.account_types <> '{member}'::text[]
         or coalesce(new.user_type, 'customer') <> 'customer' then
        raise exception 'New profiles start as role user / account type member'
          using errcode = '42501';
      end if;
    elsif new.account_types = '{member}'::text[]
          and new.user_type in ('facility_owner', 'business_provider', 'both') then
      -- Legacy privileged writers (admin console, create_ibp_profile) still
      -- send user_type only.
      new.account_types := public.account_types_for_user_type(new.user_type);
    end if;

    new.user_type := public.user_type_for_account_types(new.account_types);
    return new;
  end if;

  -- UPDATE
  if new.account_types is distinct from old.account_types then
    new.user_type := public.user_type_for_account_types(new.account_types);
  elsif new.user_type is distinct from old.user_type then
    new.account_types := public.account_types_for_user_type(new.user_type);
    new.user_type := public.user_type_for_account_types(new.account_types);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_account_types() from public, anon, authenticated;

drop trigger if exists trg_sync_account_types on public.user_profiles;
create trigger trg_sync_account_types
  before insert or update on public.user_profiles
  for each row execute function public.sync_account_types();
-- Fires after trg_prevent_role_escalation and trg_protect_user_profile_columns
-- (BEFORE triggers run in name order), so those guards see the caller's raw
-- values and this one only normalises.

-- ── 5. Guard account_types for direct client writes ─────────────────────────
create or replace function public.protect_user_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (select public.is_admin()) then
    return new;
  end if;

  if new.account_types is distinct from old.account_types then
    raise exception 'account_types can''t be changed here' using errcode = '42501';
  end if;
  if new.user_type is distinct from old.user_type then
    raise exception 'user_type can''t be changed here' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'status can''t be changed here' using errcode = '42501';
  end if;
  if new.public_id is distinct from old.public_id then
    raise exception 'public_id can''t be changed here' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'deleted_at can''t be changed here' using errcode = '42501';
  end if;
  if new.fitcoins_balance is distinct from old.fitcoins_balance
     or new.lifetime_fitcoins_earned is distinct from old.lifetime_fitcoins_earned then
    raise exception 'FitCoins can''t be changed here' using errcode = '42501';
  end if;
  if new.is_admin is distinct from old.is_admin
     or new.admin_role is distinct from old.admin_role
     or new.admin_permissions is distinct from old.admin_permissions then
    raise exception 'admin fields can''t be changed here' using errcode = '42501';
  end if;
  if new.login_attempts is distinct from old.login_attempts
     or new.locked_until is distinct from old.locked_until
     or new.last_login_at is distinct from old.last_login_at
     or new.mfa_enabled is distinct from old.mfa_enabled
     or new.mfa_verified_at is distinct from old.mfa_verified_at
     or new.whitelisted_ips is distinct from old.whitelisted_ips then
    raise exception 'security fields can''t be changed here' using errcode = '42501';
  end if;
  if new.notes is distinct from old.notes
     or new.department is distinct from old.department
     or new.location is distinct from old.location then
    raise exception 'staff fields can''t be changed here' using errcode = '42501';
  end if;
  if new.whatsapp_opt_in_at is distinct from old.whatsapp_opt_in_at
     and new.whatsapp_opt_in is not distinct from old.whatsapp_opt_in then
    raise exception 'whatsapp_opt_in_at is set by the server' using errcode = '42501';
  end if;
  if new.requires_password_change is distinct from old.requires_password_change
     and new.requires_password_change is true then
    raise exception 'requires_password_change can only be cleared here' using errcode = '42501';
  end if;
  if regexp_replace(coalesce(new.phone_number, ''), '\s', '', 'g')
     is distinct from regexp_replace(coalesce(old.phone_number, ''), '\s', '', 'g') then
    raise exception 'Change your phone number through phone verification' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── 6. role vocabulary check (keeps the existing invite/admin logic) ────────
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_email text;
  has_invite boolean;
begin
  if NEW.role is distinct from 'user'
     and NEW.role not in (select r.role from public.admin_platform_roles r) then
    raise exception 'Unknown role: %', NEW.role using errcode = '22023';
  end if;

  if NEW.role is distinct from OLD.role then
    if auth.role() = 'service_role' then
      return NEW; -- trusted server-side writes (admin dashboard via service key)
    end if;

    if public.is_admin() then
      return NEW; -- an existing admin changing someone's role
    end if;

    select email into caller_email from auth.users where id = auth.uid();

    select exists (
      select 1 from public.user_invites
      where email = caller_email
        and role = NEW.role
        and expires_at > now()
        and used_at is null
        and coalesce(is_revoked, false) = false
    ) into has_invite;

    if has_invite then
      update public.user_invites
        set used_at = now(), used_by = auth.uid()
        where email = caller_email and role = NEW.role and used_at is null;
      return NEW;
    end if;

    raise exception 'Only admins can change a user''s role';
  end if;

  return NEW;
end;
$function$;

-- ── 7. handle_new_user: account type from app_metadata only ────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_types text[] := '{member}'::text[];
begin
  -- raw_app_meta_data can only be written with the service-role key
  -- (auth.admin.createUser / updateUserById), unlike raw_user_meta_data,
  -- which any client can set at sign-up. Provider accounts come from
  -- registerProviderAccount() (PLAN.md P0-06) with
  -- app_metadata.account_types = ['provider'].
  if jsonb_typeof(new.raw_app_meta_data -> 'account_types') = 'array' then
    select coalesce(array_agg(distinct t order by t), '{member}'::text[])
      into v_types
      from jsonb_array_elements_text(new.raw_app_meta_data -> 'account_types') t
     where t in ('member', 'provider', 'partner');
  end if;

  insert into public.user_profiles (
    user_id, first_name, last_name, phone_number, sex, dob,
    role, account_types, status
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''),  ''),
    coalesce(nullif(new.raw_user_meta_data->>'phone_number', ''), ''),
    nullif(new.raw_user_meta_data->>'sex', ''),
    nullif(new.raw_user_meta_data->>'dob', ''),
    -- Role is ALWAYS 'user' at signup regardless of metadata: platform admin
    -- roles can only be granted by an existing admin after the fact.
    'user',
    v_types,
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
