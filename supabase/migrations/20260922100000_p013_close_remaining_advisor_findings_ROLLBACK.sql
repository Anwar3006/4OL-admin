-- Rollback for 20260922100000_p013_close_remaining_advisor_findings.sql
--
-- Restores the exact pre-migration function bodies, fetched via
-- pg_get_functiondef() off prod immediately before this migration ran.

ALTER FUNCTION public._resolve_legacy_provider_type(text) RESET search_path;
ALTER FUNCTION public.build_top_rated_module_data(text, uuid) RESET search_path;
ALTER FUNCTION public.get_admin_dashboard_stats() RESET search_path;
ALTER FUNCTION public.admin_global_search(text, integer) RESET search_path;

GRANT EXECUTE ON FUNCTION public.admin_global_search(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_catalogue_item_publish_guard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_log_provider_activity() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_provider_credential_status_change() TO anon, authenticated;

-- Original body: selected from the never-existent `users` table and never
-- populated sticky_users_count/other_gender_count/active_medication_
-- remainders (all NOT NULL) — restoring it re-breaks the cron on both
-- counts exactly as it was found, on purpose.
CREATE OR REPLACE FUNCTION public.capture_daily_metrics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO platform_metrics_history (
    date,
    total_users,
    new_signups_today,
    daily_active_users,
    monthly_active_users,
    male_count,
    female_count,
    total_facilities,
    facility_types
  )
VALUES (
  CURRENT_DATE,
  (SELECT count(*) FROM users),
  (SELECT count(*) FROM users WHERE created_at >= CURRENT_DATE),
  (SELECT count(*) FROM users WHERE last_active >= now() - interval '24 hours'),
  (SELECT count(*) FROM users WHERE last_active >= now() - interval '30 days'),
  (SELECT count(*) FROM users WHERE gender = 'male'),
  (SELECT count(*) FROM users WHERE gender = 'female'),
  (SELECT count(*) FROM providers WHERE status = 'active'),
  (SELECT jsonb_object_agg(provider_type, count)
   FROM (SELECT provider_type, count(*) FROM providers GROUP BY provider_type) AS t)
)
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    daily_active_users = EXCLUDED.daily_active_users,
    total_facilities = EXCLUDED.total_facilities,
    monthly_active_users = EXCLUDED.monthly_active_users,
    new_signups_today = EXCLUDED.new_signups_today,
    male_count = EXCLUDED.male_count,
    female_count = EXCLUDED.female_count,
    facility_types = EXCLUDED.facility_types;
END;
$function$;
