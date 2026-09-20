-- ============================================================================
-- P0-05 step 2 · finalize identity (PLAN.md P0-05) — DO NOT APPLY until:
--   1. The admin-console P0-05 code is deployed (it no longer writes
--      user_type, is_admin or admin_role — see PLAN.md P0-05 "Code first").
--   2. The pre-flight query below returns no rows.
-- ============================================================================
--
-- After this, user_type is a GENERATED, read-only mirror of account_types,
-- kept only because app builds already in the stores read it
-- (select('*') on user_profiles, ChatsScreenContent, _layout). Any write to
-- user_type fails with "column can only be updated to DEFAULT".
--
-- Pre-flight (run first; must return 0 rows):
--   select p.proname from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.prosrc ~* '(insert|update)[^;]*\muser_type\M'
--     and p.proname not in ('create_ibp_profile');   -- retired with ibp (P0-12)
--   select p.proname from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and (p.prosrc ~ '\mup\.is_admin\M' or p.prosrc ~ '\madmin_role\M(?!_)')
--     and p.proname <> 'protect_user_profile_columns';  -- replaced in section 2 below
-- (Checked 20 Sept 2026: only create_ibp_profile writes user_type; only
--  protect_user_profile_columns reads admin_role / is_admin.)
-- ============================================================================

-- ── 1. Sync trigger becomes an insert guard only ───────────────────────────
create or replace function public.sync_account_types()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.account_types := coalesce(new.account_types, '{member}'::text[]);
    if current_user in ('authenticated', 'anon')
       and not coalesce((select public.is_admin()), false)
       and (coalesce(new.role, 'user') <> 'user'
            or new.account_types <> '{member}'::text[]) then
      raise exception 'New profiles start as role user / account type member'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_account_types on public.user_profiles;
create trigger trg_sync_account_types
  before insert on public.user_profiles
  for each row execute function public.sync_account_types();

-- ── 2. protect_user_profile_columns: drop the user_type line ────────────────
--      (generated columns aren't computed yet inside BEFORE triggers)
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

-- ── 3. user_type → generated mirror ────────────────────────────────────────
alter table public.user_profiles drop column user_type;
alter table public.user_profiles add column user_type text
  generated always as (public.user_type_for_account_types(account_types)) stored;

-- ── 4. Drop the legacy admin columns ───────────────────────────────────────
alter table public.user_profiles
  drop column if exists admin_role,
  drop column if exists is_admin,
  drop column if exists admin_permissions;
drop type if exists public.admin_role;

-- create_ibp_profile() still writes user_type and would now fail; it is dead
-- (ibp has 0 rows) and is dropped with ibp in P0-12.
