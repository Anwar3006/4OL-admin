-- Fix: the admin dashboard 500s on the first load after a fresh login.
--
-- Symptom: /api/dashboard/overview returns 500 once, then works on refresh.
-- Cause (confirmed in prod logs, 23 Sept): get_platform_overview_metrics()
-- was cancelled with 57014 "canceling statement due to statement timeout".
-- PostgREST connects as `authenticator`, whose rolconfig sets
-- statement_timeout = 8s, and SET ROLE service_role does not lift it. The
-- function warm-runs in 2.7s and does ~35 full-table scans, so on a cold
-- buffer cache — which is exactly what a fresh login hits — it crosses 8s.
-- The route has no retry, so the cancellation surfaces as a 500.
--
-- The single biggest cost was this, inside the function's recent_activity CTE:
--
--     select ... from activity_logs order by created_at desc limit 10
--
-- activity_logs holds 13,326 rows but 43 MB (wide old_data/new_data jsonb) and
-- had NO index on created_at, so the top-10 was a full heap scan plus a sort.
-- Measured on prod in a rolled-back transaction:
--
--     top 10 rows:  1106 ms -> 2 ms
--     whole RPC:    2747 ms -> 607 ms
--
-- admin_activity_logs — the same shape of table — already carries exactly this
-- index (idx_admin_logs_created), so this closes an inconsistency rather than
-- introducing a new pattern. It also speeds up every admin activity list that
-- orders by recency, not just the dashboard.
--
-- DESC to match the query's ordering. Postgres can read a btree backwards, so
-- ASC would also be used; DESC is written out because that is the only order
-- anything asks for, and it makes the intent legible next to the query.

create index if not exists idx_activity_logs_created_at
  on public.activity_logs (created_at desc);

comment on index public.idx_activity_logs_created_at is
  'Serves the recency ordering in get_platform_overview_metrics() and the admin activity lists. Added 23 Sept 2026 after the dashboard overview RPC was cancelled by the 8s authenticator statement_timeout on a cold cache.';
