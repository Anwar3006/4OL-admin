-- =============================================================================
-- P0-11: daily sweep — push reminders at 30/7/1 days before a verified
-- credential's expires_at, and flip status to 'expired' on the day (which
-- fires trg_provider_credential_status_change, removing the capabilities and
-- recomputing verification_status — same trigger an admin manually setting
-- 'expired' would hit). Never suspends a provider automatically, per PLAN.md.
--
-- Push goes out directly via dispatch_notification (pure SQL, works today).
-- Email is a SendGrid call (lib/email.ts), which Postgres can't do itself, so
-- this also fires a net.http_post at a Supabase Edge Function URL following
-- the exact pattern already used for send-period-reminders/send-workout-
-- reminders (x-cron-secret from vault, same header shape). That endpoint
-- doesn't exist yet — net.http_post queues the request async and doesn't
-- raise on a 404, so this is inert (not broken) until someone builds
-- supabase/functions/send-provider-credential-reminders (or repoints this
-- job at wherever the app-code model decides the email should come from).
-- Zero verified credentials with an expires_at exist today, so this job is a
-- no-op until P0-14's Credentials tab produces real submissions.
-- =============================================================================

create or replace function public.fn_provider_credential_expiry_sweep()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_recipients jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'user_id', p.owner_id,
    'title', 'Licence expiring soon',
    'body', ct.label || ' for ' || p.name || ' expires on ' || to_char(pc.expires_at, 'YYYY-MM-DD'),
    'type', 'credential_expiry',
    'metadata', jsonb_build_object(
      'provider_id', p.id, 'credential_id', pc.id,
      'credential_type', pc.credential_type, 'expires_at', pc.expires_at
    )
  ))
  into v_recipients
  from public.provider_credentials pc
  join public.providers p on p.id = pc.provider_id
  join public.credential_types ct on ct.key = pc.credential_type
  where pc.status = 'verified'
    and pc.expires_at is not null
    and (pc.expires_at - current_date) in (30, 7, 1);

  if v_recipients is not null then
    perform public.dispatch_notification(v_recipients);
  end if;

  update public.provider_credentials
  set status = 'expired', updated_at = now()
  where status = 'verified'
    and expires_at is not null
    and expires_at <= current_date;

  perform net.http_post(
    url := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-provider-credential-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.fn_provider_credential_expiry_sweep() from public, anon, authenticated;
grant execute on function public.fn_provider_credential_expiry_sweep() to service_role;

select cron.schedule(
  'provider-credential-expiry-sweep',
  '0 7 * * *',
  'select public.fn_provider_credential_expiry_sweep();'
);
