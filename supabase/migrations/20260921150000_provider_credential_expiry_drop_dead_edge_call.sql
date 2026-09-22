-- The app-code follow-up to P0-11 built credential-expiry email delivery as
-- a Next.js route (app/api/cron/provider-credential-reminders) triggered by
-- a new vercel.json cron entry (0 7 * * *), not the Supabase Edge Function
-- this pg_cron job's net.http_post call was written for. That Edge Function
-- was never built and now never will be, so the call was permanently dead —
-- firing daily against a URL with no receiver. Harmless (pg_net doesn't
-- raise on a 404) but confusing and pointless. Removed; push notifications
-- via dispatch_notification and the expiry-day status flip are unaffected.
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
end;
$$;
