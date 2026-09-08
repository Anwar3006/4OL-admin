-- ============================================================
-- fitness_user_assignments.status never flips to 'completed' when a plan's
-- schedule window elapses -- the app has always computed expiry client-side
-- (isAssignmentExpired in index.tsx) and the DB row just sits at 'active'
-- forever. This doesn't break the app (nothing server-side currently
-- depends on status reflecting expiry), but it leaves admin views and any
-- future query that trusts `status` directly out of sync with reality.
--
-- Additive only: the client-side calc stays as the source of instant UI
-- feedback (no round-trip needed to know a plan looks expired). This job
-- just reconciles the DB truth once a day, since expiry is a slow-moving
-- state and nothing needs sub-day precision here.
-- ============================================================

create or replace function public.fn_fitness_expire_stale_assignments()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.fitness_user_assignments fua
  set status = 'completed',
      updated_at = now()
  from public.fitness_plans fp
  where fua.plan_id = fp.id
    and fua.status = 'active'
    and fua.started_at + (fp.duration_weeks * interval '7 days') < now();
end;
$$;

revoke all on function public.fn_fitness_expire_stale_assignments() from public, anon, authenticated;
grant execute on function public.fn_fitness_expire_stale_assignments() to service_role;

-- Schedule with pg_cron when the extension is available (Supabase projects
-- enable it via dashboard). Runs daily at 03:00 UTC. Re-runnable: the job
-- name is unscheduled first when the API supports it.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('fitness-expire-stale-assignments');
    exception when others then null;
    end;
    perform cron.schedule('fitness-expire-stale-assignments', '0 3 * * *',
      $cron$select public.fn_fitness_expire_stale_assignments()$cron$);
  else
    raise notice 'pg_cron not installed — fn_fitness_expire_stale_assignments created but not scheduled. Enable pg_cron and re-run this migration, or call the function manually.';
  end if;
end;
$$;
