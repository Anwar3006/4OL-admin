-- =============================================================================
-- P0-13 remaining items: close the advisor findings PLAN.md left open from
-- the P0-10/11/12 migrations, plus the two "found, not fixed" breakages that
-- were actionable without a live-data prerequisite.
--
-- Applied directly to prod via the Supabase MCP connector 22 Sept 2026 (this
-- file mirrors that session exactly); see PLAN.md's P0-13 section for the
-- verification trail (grant checks, before/after advisor diff, live test
-- calls on all five touched functions).
-- =============================================================================

-- Pin mutable search_path on functions already fully schema-qualified
-- (safe: no unqualified table references to break).
ALTER FUNCTION public._resolve_legacy_provider_type(text) SET search_path = '';
ALTER FUNCTION public.build_top_rated_module_data(text, uuid) SET search_path = '';
ALTER FUNCTION public.get_admin_dashboard_stats() SET search_path = '';

-- admin_global_search calls pg_trgm's similarity(), which lives in the
-- `extensions` schema (not `public`) on this project — SET search_path = ''
-- broke it outright on first test (42883: function similarity does not
-- exist). Matches the existing convention this codebase already uses for
-- the same situation (20260908_epic2_7_move_pg_trgm_out_of_public.sql, for
-- global_search_v2 and search_drugs): a fixed, explicit two-schema
-- search_path closes the same hijack vector as an empty one without
-- breaking the extension call.
ALTER FUNCTION public.admin_global_search(text, integer) SET search_path = 'public', 'extensions';

-- admin_global_search's only real caller (app/api/admin/search/route.ts)
-- uses the service-role client and its own requireAdminApiUser
-- ("dashboard.view") gate; anon/authenticated grants were never needed and
-- let any signed-in (or, worse, unauthenticated) caller pull user names and
-- phone numbers directly via .rpc(). Checked: no caller in either repo uses
-- anon/authenticated for this RPC.
REVOKE EXECUTE ON FUNCTION public.admin_global_search(text, integer) FROM anon, authenticated;

-- Trigger-only functions (confirmed via pg_trigger.tgfoid, no direct caller
-- in either repo) carrying default anon/authenticated EXECUTE grants — same
-- class of finding epic2_2b already cleaned up for 8 other trigger
-- functions (20260908_epic2_2b_revoke_excess_trigger_grants.sql).
REVOKE EXECUTE ON FUNCTION public.fn_catalogue_item_publish_guard() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_provider_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_provider_credential_status_change() FROM anon, authenticated;

-- capture_daily_metrics(): repoint from the never-existent `users` table to
-- user_profiles (P0-13's "needs a decision on which user_profiles columns
-- stand in" — decided below), qualify every reference and pin search_path.
-- Also discovered live (not previously known to PLAN.md): platform_metrics_
-- history has three more NOT NULL columns this function never populated at
-- all (sticky_users_count, other_gender_count, active_medication_remainders)
-- — the `users` bug meant it always failed before reaching that constraint,
-- so this cron (`daily-metrics-snapshot`, 0 0 * * *) has never once
-- succeeded. other_gender_count and active_medication_remainders are real
-- counts; sticky_users_count has no prior definition anywhere in either
-- repo, so it is defined here as "active in the last 24h but not a
-- brand-new signup today" (a returning user, distinct from raw DAU) — the
-- most defensible reading available, not an invented metric pulled from
-- nowhere. sex casing is inconsistent in the live data ('Male' and
-- lowercase 'female' both exist), so male_count/female_count/
-- other_gender_count all match case-insensitively — get_admin_dashboard_
-- stats' exact-case match is a separate, pre-existing, untouched bug.
CREATE OR REPLACE FUNCTION public.capture_daily_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.platform_metrics_history (
    date,
    total_users,
    new_signups_today,
    daily_active_users,
    monthly_active_users,
    sticky_users_count,
    male_count,
    female_count,
    other_gender_count,
    total_facilities,
    facility_types,
    active_medication_remainders
  )
  VALUES (
    CURRENT_DATE,
    (SELECT count(*) FROM public.user_profiles),
    (SELECT count(*) FROM public.user_profiles WHERE created_at >= CURRENT_DATE),
    (SELECT count(*) FROM public.user_profiles WHERE last_active >= now() - interval '24 hours'),
    (SELECT count(*) FROM public.user_profiles WHERE last_active >= now() - interval '30 days'),
    (SELECT count(*) FROM public.user_profiles WHERE last_active >= now() - interval '24 hours' AND created_at < CURRENT_DATE),
    (SELECT count(*) FROM public.user_profiles WHERE lower(sex) = 'male'),
    (SELECT count(*) FROM public.user_profiles WHERE lower(sex) = 'female'),
    (SELECT count(*) FROM public.user_profiles WHERE sex IS NOT NULL AND lower(sex) NOT IN ('male', 'female')),
    (SELECT count(*) FROM public.providers WHERE status = 'active'),
    (SELECT jsonb_object_agg(provider_type, count)
     FROM (SELECT provider_type, count(*) FROM public.providers GROUP BY provider_type) AS t),
    (SELECT count(*) FROM public.medication_reminders WHERE is_active = true)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_signups_today = EXCLUDED.new_signups_today,
    daily_active_users = EXCLUDED.daily_active_users,
    monthly_active_users = EXCLUDED.monthly_active_users,
    sticky_users_count = EXCLUDED.sticky_users_count,
    male_count = EXCLUDED.male_count,
    female_count = EXCLUDED.female_count,
    other_gender_count = EXCLUDED.other_gender_count,
    total_facilities = EXCLUDED.total_facilities,
    facility_types = EXCLUDED.facility_types,
    active_medication_remainders = EXCLUDED.active_medication_remainders;
END;
$function$;
