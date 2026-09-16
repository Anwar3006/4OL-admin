-- expire_stale_admin_sessions() hardcoded 30 idle minutes while
-- platform_settings.security_settings.session_timeout_mins (surfaced in
-- Settings -> Security, default 60) is what the browser enforces. The two
-- disagreed, so raising the timeout in Settings left this job still closing
-- admin_sessions rows at 30 minutes -- making the "your active sessions"
-- list and every session metric read as though admins had been signed out
-- half an hour before they actually were.
--
-- The explicit argument still wins when one is passed, so an operator can
-- force a sweep at a different threshold. With no argument it now reads the
-- saved policy and falls back to 60, matching DEFAULT_TIMEOUT_MINUTES in
-- app/api/admin/session-policy/route.ts.

create or replace function public.expire_stale_admin_sessions(p_idle_minutes int default null)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n int;
  idle_minutes int;
begin
  idle_minutes := coalesce(
    p_idle_minutes,
    (select nullif((security_settings ->> 'session_timeout_mins'), '')::int
       from public.platform_settings
      where id = 'global'),
    60
  );
  -- Same bounds the API clamps to, so a bad stored value cannot reap live
  -- sessions or disable the sweep entirely.
  idle_minutes := least(720, greatest(5, idle_minutes));

  update public.admin_sessions
     set is_active    = false,
         ended_at     = coalesce(ended_at, now()),
         ended_reason = coalesce(ended_reason, 'timeout'),
         updated_at   = now()
   where is_active
     and last_active_at < now() - make_interval(mins => idle_minutes);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.expire_stale_admin_sessions(int) from public, anon, authenticated;
grant execute on function public.expire_stale_admin_sessions(int) to service_role;

comment on function public.expire_stale_admin_sessions(int) is
  'Closes idle admin_sessions rows. With no argument it follows platform_settings.security_settings.session_timeout_mins (clamped 5-720, default 60) so the sweep matches what the browser enforces.';

-- The job passed 30 explicitly, which would override the lookup above.
select cron.unschedule('expire-stale-admin-sessions');
select cron.schedule(
  'expire-stale-admin-sessions',
  '*/15 * * * *',
  $ct$select public.expire_stale_admin_sessions()$ct$
);
