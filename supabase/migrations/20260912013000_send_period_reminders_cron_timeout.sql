-- send-period-reminders' cron-triggered net.http_post call had no explicit
-- timeout, so it used pg_net's 5000ms default. Confirmed via
-- net._http_response.error_msg ("Timeout of 5000 ms reached...") that this
-- edge function invocation intermittently exceeds that window (cold starts /
-- latency), silently dropping the tick entirely with no response ever
-- recorded -- e.g. it's exactly what caused a scheduled checklist follow-up
-- notification to never go out. Bumped to 15s. The same 5s-default pattern
-- shows up on other cron-http_post jobs (send-reminders, at minimum) but
-- fixing those is out of scope here.
select cron.alter_job(
  job_id := 38,
  command := $$
    select net.http_post(
      url     := 'https://rhbbxttxnvcziyqzptqs.supabase.co/functions/v1/send-period-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_function_shared_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    )
  $$
);
