-- Schedule expire_delete_account_grace_periods() to run daily.
--
-- Unlike the notification cron jobs (send-reminders, send-workout-
-- reminders), this doesn't need net.http_post/an Edge Function or a
-- service-role key pasted into SQL — the work is entirely inside Postgres
-- (SECURITY DEFINER function, service_role-only EXECUTE grant), so
-- pg_cron can call it directly. The EXECUTE grant restriction only
-- affects callers going through PostgREST (anon/authenticated API roles);
-- pg_cron jobs run as the role that scheduled them (postgres by default
-- in Supabase), which as owner/superuser isn't subject to that grant.

SELECT cron.schedule(
  'expire-delete-account-grace-periods-daily',
  '0 3 * * *', -- 3am daily
  $$ SELECT public.expire_delete_account_grace_periods(); $$
);

-- To unschedule later: SELECT cron.unschedule('expire-delete-account-grace-periods-daily');
