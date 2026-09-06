-- APPLIED 6 Sept 2026. Applied as two migrations (the first invented an
-- ended_reason the table's check constraint rejects); this file carries the
-- corrected end state. Compare on content, not on name.
--
-- Nothing ever closed an admin_sessions row. Not one row in the table had
-- ended_at set — not the 24 from real August use, not the 1,328 the Playwright
-- smoke sweep created. The only thing that ends a session is a DELETE fired
-- from the SIGNED_OUT handler in DashboardWrapper, and closing a tab (or a
-- headless browser) never fires it.
--
-- Scope of the damage, measured rather than assumed:
--   * get_admin_dashboard_metrics counts `distinct admin_id`, so 1,352 rows
--     for one admin still reported online_now = 1. The headline metric was
--     never wrong.
--   * The per-admin "your active sessions" list and the table's unbounded
--     growth were the real cost.
--
-- ended_reason is constrained to logout | timeout | forced | password_change |
-- security_alert, so idle expiry is 'timeout'. The constraint is the
-- vocabulary — do not widen it for this.
--
-- 30 minutes sits well past the 5-minute heartbeat and the 15-minute freshness
-- window get_admin_dashboard_metrics uses, so a live session is never reaped
-- between beats.

create or replace function public.expire_stale_admin_sessions(p_idle_minutes int default 30)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  n int;
begin
  update public.admin_sessions
     set is_active    = false,
         ended_at     = coalesce(ended_at, now()),
         ended_reason = coalesce(ended_reason, 'timeout'),
         updated_at   = now()
   where is_active
     and last_active_at < now() - make_interval(mins => p_idle_minutes);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.expire_stale_admin_sessions(int) from public, anon, authenticated;
grant execute on function public.expire_stale_admin_sessions(int) to service_role;

create index if not exists idx_admin_sess_active_last_seen
  on public.admin_sessions (last_active_at)
  where is_active;

-- Every 15 minutes, matching the sibling detect-admin-multi-ip-sessions job.
-- Registered via cron.schedule() rather than an INSERT into cron.job:
--   select cron.schedule('expire-stale-admin-sessions', '*/15 * * * *',
--                        $ct$select public.expire_stale_admin_sessions(30)$ct$);
--
-- Backfill run once on 6 Sept 2026: 1,178 rows closed, leaving 174 active and
-- all of them under 30 minutes old.
