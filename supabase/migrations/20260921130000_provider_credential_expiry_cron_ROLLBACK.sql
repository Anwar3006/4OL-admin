-- Rollback for 20260921130000_provider_credential_expiry_cron.sql
select cron.unschedule('provider-credential-expiry-sweep');
drop function if exists public.fn_provider_credential_expiry_sweep();
