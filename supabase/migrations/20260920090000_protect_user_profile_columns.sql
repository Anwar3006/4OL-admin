-- ============================================================================
-- P0-01b · Close the direct-PostgREST path to admin/system columns on
--          user_profiles (PLAN.md P0-01)
-- ============================================================================
--
-- P0-01 put an allow-list on PATCH /api/user/profile. That closed the API door
-- but not the database door: the RLS policy "Users can update own profile"
-- lets any signed-in user UPDATE any column of their own row straight through
-- PostgREST (the mobile app even has a fallback that does exactly that,
-- hooks/use-userProfile.tsx updateProfileDirectly). prevent_role_escalation()
-- guards only `role`, so today a user can set their own user_type, status,
-- fitcoins_balance, mfa flags, etc.
--
-- This trigger rejects changes to those columns when the statement runs as the
-- `authenticated` or `anon` database role, unless the caller is an admin.
--
-- ── Why current_user and not auth.role() ────────────────────────────────────
-- Legitimate writers of these columns are SECURITY DEFINER functions owned by
-- postgres (award_fitcoins, register_push_token, record_app_review_prompt,
-- submit_app_review, purge_or_anonymize_user, admin session functions …).
-- Inside them auth.role() is still 'authenticated' (the JWT doesn't change) but
-- current_user is 'postgres'. Service-role API routes run as service_role.
-- So "current_user in (authenticated, anon)" is exactly "a client wrote this
-- directly". The function below is SECURITY INVOKER on purpose — making it
-- DEFINER would turn current_user into its owner and disable the check.
--
-- ── What stays writable by the user directly ────────────────────────────────
-- Everything in lib/user-profile-patch.ts EDITABLE_PROFILE_FIELDS (names,
-- preferences, consents, onboarding flags). requires_password_change may be
-- cleared (true → false) but not set. phone_number changes go through the OTP
-- route (service role); an unchanged value passes.
-- ============================================================================

create or replace function public.protect_user_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Only direct client writes are checked (see header).
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (select public.is_admin()) then
    return new;
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

revoke all on function public.protect_user_profile_columns() from public, anon, authenticated;

drop trigger if exists trg_protect_user_profile_columns on public.user_profiles;
create trigger trg_protect_user_profile_columns
  before update on public.user_profiles
  for each row execute function public.protect_user_profile_columns();

-- ── Verification (run after applying; all four must behave as noted) ───────
-- As an ordinary signed-in user through PostgREST:
--   update user_profiles set first_name = 'Ama' where user_id = auth.uid();          -- ok
--   update user_profiles set user_type = 'business_provider' where user_id = auth.uid(); -- 42501
--   update user_profiles set fitcoins_balance = 999999 where user_id = auth.uid();   -- 42501
-- As postgres via award_fitcoins(...):                                               -- ok
