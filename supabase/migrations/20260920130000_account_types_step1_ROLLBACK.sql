-- ROLLBACK for 20260920130000_account_types_step1
-- Restores handle_new_user(), prevent_role_escalation() and
-- protect_user_profile_columns() to their pre-step-1 bodies and removes
-- account_types. user_type values written meanwhile are kept (they are the
-- normalised mirror). Only run this BEFORE step 2 has been applied.
begin;

drop trigger if exists trg_sync_account_types on public.user_profiles;
drop function if exists public.sync_account_types();
drop function if exists public.user_type_for_account_types(text[]);
drop function if exists public.account_types_for_user_type(text);

drop index if exists public.user_profiles_account_types_gin;
alter table public.user_profiles drop constraint if exists user_profiles_account_types_chk;
alter table public.user_profiles drop column if exists account_types;

-- role default/not-null are kept: they matched existing data and are harmless.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.user_profiles (
    user_id, first_name, last_name, phone_number, sex, dob, role, user_type, status
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''),  ''),
    coalesce(nullif(new.raw_user_meta_data->>'phone_number', ''), ''),
    nullif(new.raw_user_meta_data->>'sex', ''),
    nullif(new.raw_user_meta_data->>'dob', ''),
    'user',
    coalesce(nullif(new.raw_user_meta_data->>'user_type', ''), 'customer'),
    'active'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_email text;
  has_invite boolean;
begin
  if NEW.role is distinct from OLD.role then
    if auth.role() = 'service_role' then
      return NEW;
    end if;
    if public.is_admin() then
      return NEW;
    end if;
    select email into caller_email from auth.users where id = auth.uid();
    select exists (
      select 1 from public.user_invites
      where email = caller_email and role = NEW.role and expires_at > now()
        and used_at is null and coalesce(is_revoked, false) = false
    ) into has_invite;
    if has_invite then
      update public.user_invites set used_at = now(), used_by = auth.uid()
        where email = caller_email and role = NEW.role and used_at is null;
      return NEW;
    end if;
    raise exception 'Only admins can change a user''s role';
  end if;
  return NEW;
end;
$function$;

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


commit;
