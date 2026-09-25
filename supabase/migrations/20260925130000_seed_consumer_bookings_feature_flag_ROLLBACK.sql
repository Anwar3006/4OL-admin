-- Rollback for 20260925130000_seed_consumer_bookings_feature_flag.sql.
-- Do not remove a flag an administrator has changed after this migration.

delete from public.feature_flags
where name = 'consumer-bookings'
  and enabled = true
  and rollout_percentage = 100;

create or replace function public.is_feature_enabled(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (
      select f.enabled and coalesce(f.rollout_percentage, 100) > 0
      from public.feature_flags f
      where f.name = p_name
        and p_name in ('provider_portal', 'rx_epharmacy', 'provider_paid_chat')
    ),
    false
  );
$function$;

revoke execute on function public.is_feature_enabled(text) from public;
grant execute on function public.is_feature_enabled(text) to anon, authenticated;
