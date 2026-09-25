-- Rollback for 20260925160000_retention_cleanup_cron.sql.
-- Deleted activity_logs rows and removed storage objects are NOT restored;
-- this only stops future runs.

select cron.unschedule('retention-cleanup-daily')
where exists (select 1 from cron.job where jobname = 'retention-cleanup-daily');

drop function if exists public.run_retention_cleanup(boolean);
drop function if exists public.find_orphaned_storage_images(text[], interval);
