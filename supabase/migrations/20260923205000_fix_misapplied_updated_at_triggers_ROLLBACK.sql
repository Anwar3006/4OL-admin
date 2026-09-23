-- ROLLBACK for fix_misapplied_updated_at_triggers
--
-- WARNING: restoring these triggers makes all eight tables unwritable on
-- UPDATE again (42703: record "new" has no field "updated_at"). There is no
-- reason to run this other than to reproduce the bug.

create trigger trg_admin_activity_logs_updated_at before update on public.admin_activity_logs
  for each row execute function public.update_updated_at_column();
create trigger trg_bed_tracker_alerts_updated_at before update on public.bed_tracker_alerts
  for each row execute function public.update_updated_at_column();
create trigger trg_bed_tracker_facilities_updated_at before update on public.bed_tracker_facilities
  for each row execute function public.update_updated_at_column();
create trigger trg_collector_submissions_updated_at before update on public.collector_submissions
  for each row execute function public.update_updated_at_column();
create trigger trg_facility_scout_referrals_updated_at before update on public.facility_scout_referrals
  for each row execute function public.update_updated_at_column();
create trigger trg_notification_automation_rules_updated_at before update on public.notification_automation_rules
  for each row execute function public.update_updated_at_column();
create trigger trg_platform_metrics_snapshots_updated_at before update on public.platform_metrics_snapshots
  for each row execute function public.update_updated_at_column();
create trigger trg_transaction_records_updated_at before update on public.transaction_records
  for each row execute function public.update_updated_at_column();
