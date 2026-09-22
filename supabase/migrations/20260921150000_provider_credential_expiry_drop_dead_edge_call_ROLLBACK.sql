-- Rollback for 20260921150000_provider_credential_expiry_drop_dead_edge_call.sql
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
