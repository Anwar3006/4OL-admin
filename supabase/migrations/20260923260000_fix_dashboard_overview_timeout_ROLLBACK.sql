-- Rollback for 20260923260000_fix_dashboard_overview_timeout.sql
--
-- Dropping this index restores the pre-fix behaviour: the dashboard overview
-- RPC goes back to a full 43 MB heap scan for its 10 most recent activity rows
-- (~1.1s warm) and will 500 again on a cold cache. Nothing depends on the
-- index for correctness, so the drop is safe at any time.

drop index if exists public.idx_activity_logs_created_at;
