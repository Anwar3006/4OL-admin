-- Epic 2.6 (TASKS.md): the medication/workout/trivia/storage-cleanup cron
-- jobs embedded a literal legacy anon JWT as their only "auth" for calling
-- internal Edge Functions, and the 4 functions themselves performed zero
-- authorization beyond Supabase's gateway verify_jwt check -- which accepts
-- ANY valid anon-role JWT, i.e. the same public key shipped in both client
-- apps. storage-cleanup deletes storage objects; the other three send real
-- push notifications -- all four were callable on demand by anyone holding
-- a public anon key, not just by cron.
--
-- Fix: a freshly generated secret, stored only in Vault, checked inside
-- each function against an x-cron-secret header. Cron pulls it from Vault
-- via a subquery instead of embedding it as literal text. The companion
-- Edge Function deploys (storage-cleanup, send-reminders,
-- send-workout-reminders, send-trivia-live-notifications) add the header
-- check and are redeployed with verify_jwt=false, since the shared secret
-- is now the real authorization boundary.

select vault.create_secret(
  '31e53366a4adc4fd07d52de50e3d82061a018e6e665d6f0d871182877e9b78b9',
  'cron_function_shared_secret',
  'Shared secret the medication/workout/trivia/storage-cleanup cron jobs send as x-cron-secret to their internal Edge Functions.'
);

create or replace function public.verify_cron_shared_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'cron_function_shared_secret'
      and decrypted_secret = p_secret
  );
$$;

-- Supabase's default privileges on the public schema auto-grant EXECUTE to
-- anon/authenticated/service_role on function creation; "revoke ... from
-- public" only strips the PUBLIC pseudo-role, not each named role's
-- separately-recorded default grant -- both revokes are required.
revoke all on function public.verify_cron_shared_secret(text) from public;
grant execute on function public.verify_cron_shared_secret(text) to service_role;
revoke execute on function public.verify_cron_shared_secret(text) from anon, authenticated;

-- Discovered while fixing this story: the same auto-grant is almost
-- certainly why Epic 2.2 finds 65 anon-executable and 151
-- authenticated-executable SECURITY DEFINER functions -- most were
-- probably never granted deliberately.
--
-- CORRECTION (see 20260908_epic2_2c_fix_public_grant_on_trigger_functions.sql):
-- this ALTER DEFAULT PRIVILEGES does NOT reliably stop new functions from
-- getting anon/authenticated EXECUTE. Verified by creating a throwaway
-- function after this migration (and after the equivalent FROM PUBLIC
-- version in 2.2c) and finding has_function_privilege() still true for
-- both roles -- something in Supabase's platform re-applies the grant
-- independent of pg_default_acl, and no SQL-only fix for it was found.
-- Every future SECURITY DEFINER function needs an explicit REVOKE in its
-- own creation migration; this statement is left in as defense-in-depth
-- for whichever paths it does cover, not as a guarantee.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Point the 4 cron jobs at the new x-cron-secret header, sourced from
-- Vault, instead of a literal anon JWT. The functions no longer require
-- verify_jwt, so the Authorization header is dropped entirely.

select cron.alter_job(
  job_id := 16,
  command := $cmd$
    select net.http_post(
      url     := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body    := '{}'::jsonb
    )
  $cmd$
);

select cron.alter_job(
  job_id := 19,
  command := $cmd$
    select net.http_post(
      url:='https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/storage-cleanup',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body:='{}'::jsonb
    );
  $cmd$
);

select cron.alter_job(
  job_id := 23,
  command := $cmd$
    select net.http_post(
      url:='https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-workout-reminders',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body:='{}'::jsonb
    );
  $cmd$
);

select cron.alter_job(
  job_id := 28,
  command := $cmd$
    select net.http_post(
      url := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-trivia-live-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body := '{}'::jsonb
    );
  $cmd$
);
