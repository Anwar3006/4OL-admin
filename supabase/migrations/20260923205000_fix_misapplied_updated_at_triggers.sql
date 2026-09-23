-- Drop eight `update_updated_at_column()` triggers attached to tables that
-- have no `updated_at` column.
--
-- Found while building P1-08c's bed rollup, which is the first code ever to
-- UPDATE `bed_tracker_facilities`. The trigger does `NEW.updated_at = now()`,
-- and on a table without that column PL/pgSQL raises
--
--   42703: record "new" has no field "updated_at"
--
-- so the UPDATE never completes. Every one of these eight tables is therefore
-- **completely unwritable on UPDATE**, and has been since the trigger was
-- attached.
--
-- Why nobody noticed: all eight are empty (0 rows, verified before this ran),
-- so no UPDATE has ever been attempted against them in production. Latent,
-- not live — but `transaction_records` is money-adjacent and would surface
-- the moment D12 unblocks payouts, and `bed_tracker_facilities` blocks
-- P0-16's Beds tab today.
--
-- Dropping is the right fix rather than adding the column: these tables track
-- their own timestamps where they need one (`bed_tracker_facilities` and
-- `bed_tracker_alerts` use `last_updated_at`, which P1-08c's rollup sets
-- explicitly), and adding an unused column to seven tables to satisfy a
-- trigger nothing asked for is the wrong way round.
--
-- `update_updated_at_column()` itself is untouched — it is correct, and many
-- other tables that DO have the column use it properly.

drop trigger if exists trg_admin_activity_logs_updated_at on public.admin_activity_logs;
drop trigger if exists trg_bed_tracker_alerts_updated_at on public.bed_tracker_alerts;
drop trigger if exists trg_bed_tracker_facilities_updated_at on public.bed_tracker_facilities;
drop trigger if exists trg_collector_submissions_updated_at on public.collector_submissions;
drop trigger if exists trg_facility_scout_referrals_updated_at on public.facility_scout_referrals;
drop trigger if exists trg_notification_automation_rules_updated_at on public.notification_automation_rules;
drop trigger if exists trg_platform_metrics_snapshots_updated_at on public.platform_metrics_snapshots;
drop trigger if exists trg_transaction_records_updated_at on public.transaction_records;
