-- Epic 18: reconcile the fitness metric definitions between two dashboards.
--
-- get_fitness_dashboard_kpis() (KPIs.sql / 20260719_fix_fitness_kpis.sql) —
-- the Fitness module's own dashboard — defines:
--   total_fitness_users <- count(*) FROM fitness_users
--   active_plans        <- count(*) FROM fitness_user_assignments WHERE status = 'active'
--
-- get_platform_overview_metrics() (this file, until now) instead computed:
--   fitness_users <- count(*) FROM fitness_onboarding_selections
--   active_plans  <- count(*) FROM fitness_plans WHERE status = 'published'
--
-- Two different tables for the same-named metric means the platform
-- overview dashboard and the fitness module dashboard can (and did) show
-- disagreeing numbers for "fitness users" / "active plans". Adopting the
-- fitness-module's own definitions here since that's the number admins
-- already see day-to-day on the Fitness page itself.

DROP FUNCTION IF EXISTS public.get_platform_overview_metrics(text);

CREATE OR REPLACE FUNCTION public.get_platform_overview_metrics(
  time_filter text DEFAULT '30'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_at timestamptz := now();
  start_at timestamptz;
  previous_start_at timestamptz;
  window_length interval;
BEGIN
  IF lower(coalesce(time_filter, '30')) IN ('7', '7d', 'last_7_days') THEN
    start_at := now_at - interval '7 days';
  ELSIF lower(coalesce(time_filter, '30')) IN ('90', '90d', 'last_90_days') THEN
    start_at := now_at - interval '90 days';
  ELSIF lower(coalesce(time_filter, '30')) IN ('year', 'ytd', 'this_year') THEN
    start_at := date_trunc('year', now_at);
  ELSE
    start_at := now_at - interval '30 days';
  END IF;

  window_length := now_at - start_at;
  previous_start_at := start_at - window_length;

  RETURN (
    WITH
      user_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE deleted_at IS NULL)::int AS active_records,
          count(*) FILTER (WHERE status = 'active')::int AS active,
          count(*) FILTER (WHERE status = 'pending_verification')::int AS pending_verification,
          count(*) FILTER (WHERE created_at >= start_at)::int AS current_period,
          count(*) FILTER (WHERE created_at >= previous_start_at AND created_at < start_at)::int AS previous_period
        FROM user_profiles
      ),
      facility_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status::text IN ('approved', 'active'))::int AS active,
          count(*) FILTER (WHERE status::text = 'pending')::int AS pending,
          count(*) FILTER (WHERE status::text = 'rejected')::int AS rejected,
          count(*) FILTER (WHERE created_at >= start_at)::int AS current_period,
          count(*) FILTER (WHERE created_at >= previous_start_at AND created_at < start_at)::int AS previous_period
        FROM facility_profile
      ),
      content_counts AS (
        SELECT
          (SELECT count(*)::int FROM conditions) AS conditions,
          (SELECT count(*)::int FROM symptoms) AS symptoms,
          (SELECT count(*)::int FROM categories) AS categories,
          (SELECT count(*)::int FROM healthy_living_info) AS healthy_living,
          (SELECT count(*)::int FROM faqs WHERE status = 'published') AS active_faqs
      ),
      fitness_counts AS (
        SELECT
          -- FIX: was `fitness_onboarding_selections` — now matches
          -- get_fitness_dashboard_kpis's `total_fitness_users`.
          (SELECT count(*)::int FROM fitness_users) AS fitness_users,
          -- FIX: was `fitness_plans WHERE status = 'published'` (the plan
          -- catalog) — now matches get_fitness_dashboard_kpis's
          -- `active_plans` (per-user active assignments).
          (SELECT count(*)::int FROM fitness_user_assignments WHERE status = 'active') AS active_plans,
          (SELECT count(*)::int FROM fitness_challenges WHERE status::text IN ('active', 'published', 'ongoing')) AS live_challenges,
          (SELECT count(*)::int FROM fitness_exercises WHERE status = 'published') AS exercise_library,
          (SELECT count(*)::int FROM fitness_generated_workouts) AS ai_generated_workouts
      ),
      queue_counts AS (
        SELECT
          (SELECT count(*)::int FROM facility_profile WHERE status::text = 'pending') AS pending_facilities,
          (SELECT count(*)::int FROM delete_account_requests WHERE status = 'pending') AS pending_delete_requests,
          (SELECT count(*)::int FROM hcp_verifications WHERE verification_status IN ('pending', 'under_review')) AS pending_hcp_verifications,
          (SELECT count(*)::int FROM collector_submissions WHERE status IN ('pending', 'needs_review')) AS pending_facility_scout_submissions,
          (SELECT count(*)::int FROM bed_tracker_alerts WHERE is_resolved = false) AS active_bed_alerts,
          (SELECT count(*)::int FROM security_threats WHERE status::text IN ('open', 'investigating')) AS open_security_threats,
          (SELECT count(*)::int FROM content_moderation_flags WHERE status::text IN ('pending', 'under_review', 'pending_review')) AS pending_moderation_flags
      ),
      operational_counts AS (
        SELECT
          (SELECT count(*)::int FROM notification_campaigns) AS notification_campaigns,
          (SELECT count(*)::int FROM notifications) AS notifications,
          (SELECT count(*)::int FROM hcp_verifications) AS hcp_verifications,
          (SELECT count(*)::int FROM hcp_verifications WHERE verification_status = 'verified') AS verified_hcps,
          (SELECT count(*)::int FROM job_postings) AS job_postings,
          (SELECT count(*)::int FROM job_applications) AS job_applications,
          (SELECT count(*)::int FROM bed_tracker_facilities) AS bedtracker_facilities,
          (SELECT coalesce(sum(available_beds), 0)::int FROM bed_tracker_facilities) AS available_beds,
          (SELECT count(*)::int FROM collector_submissions) AS facility_scout_submissions
      ),
      finance_counts AS (
        SELECT
          count(*)::int AS transactions,
          coalesce(sum(amount) FILTER (WHERE status = 'completed'), 0)::numeric AS revenue,
          count(*) FILTER (WHERE created_at >= start_at)::int AS current_period,
          count(*) FILTER (WHERE created_at >= previous_start_at AND created_at < start_at)::int AS previous_period
        FROM transaction_records
      ),
      subscription_counts AS (
        SELECT
          count(*)::int AS subscriptions,
          count(*) FILTER (WHERE status = 'active')::int AS active_subscriptions,
          count(*) FILTER (WHERE created_at >= start_at)::int AS current_period,
          count(*) FILTER (WHERE created_at >= previous_start_at AND created_at < start_at)::int AS previous_period
        FROM user_subscriptions
      ),
      ai_counts AS (
        SELECT
          count(*)::int AS calls,
          count(*) FILTER (WHERE created_at >= now_at - interval '1 day')::int AS calls_last_24h,
          coalesce(sum(estimated_cost), 0)::numeric AS estimated_cost,
          count(*) FILTER (WHERE created_at >= start_at)::int AS current_period,
          count(*) FILTER (WHERE created_at >= previous_start_at AND created_at < start_at)::int AS previous_period
        FROM fitness_ai_calls
      ),
      regional_facilities AS (
        SELECT coalesce(
          jsonb_object_agg(region::text, total ORDER BY region::text),
          '{}'::jsonb
        ) AS by_region
        FROM (
          SELECT region, count(*)::int AS total
          FROM facility_profile
          GROUP BY region
        ) grouped
      ),
      recent_activity AS (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'actor_name', actor_name,
              'action_type', action_type,
              'target_table', target_table,
              'record_id', record_id,
              'created_at', created_at
            )
            ORDER BY created_at DESC
          ),
          '[]'::jsonb
        ) AS rows
        FROM (
          SELECT id, actor_name, action_type, target_table, record_id, created_at
          FROM activity_logs
          ORDER BY created_at DESC
          LIMIT 10
        ) activity
      )
    SELECT jsonb_build_object(
      'time_filter', coalesce(time_filter, '30'),
      'window', jsonb_build_object(
        'start_at', start_at,
        'end_at', now_at,
        'previous_start_at', previous_start_at
      ),
      'kpis', jsonb_build_object(
        'total_users', user_counts.total,
        'facilities', facility_counts.total,
        'revenue_mtd', CASE WHEN finance_counts.transactions = 0 THEN NULL ELSE finance_counts.revenue END,
        'transactions', finance_counts.transactions,
        'ai_queries_last_24h', ai_counts.calls_last_24h,
        'premium_subscriptions', subscription_counts.active_subscriptions,
        'hcps', operational_counts.hcp_verifications,
        'security_score', NULL
      ),
      'deltas', jsonb_build_object(
        'users', jsonb_build_object(
          'current', user_counts.current_period,
          'previous', user_counts.previous_period,
          'percent', CASE WHEN user_counts.previous_period = 0 THEN NULL ELSE round(((user_counts.current_period - user_counts.previous_period)::numeric / user_counts.previous_period) * 100, 1) END
        ),
        'facilities', jsonb_build_object(
          'current', facility_counts.current_period,
          'previous', facility_counts.previous_period,
          'percent', CASE WHEN facility_counts.previous_period = 0 THEN NULL ELSE round(((facility_counts.current_period - facility_counts.previous_period)::numeric / facility_counts.previous_period) * 100, 1) END
        ),
        'transactions', jsonb_build_object(
          'current', finance_counts.current_period,
          'previous', finance_counts.previous_period,
          'percent', CASE WHEN finance_counts.previous_period = 0 THEN NULL ELSE round(((finance_counts.current_period - finance_counts.previous_period)::numeric / finance_counts.previous_period) * 100, 1) END
        ),
        'subscriptions', jsonb_build_object(
          'current', subscription_counts.current_period,
          'previous', subscription_counts.previous_period,
          'percent', CASE WHEN subscription_counts.previous_period = 0 THEN NULL ELSE round(((subscription_counts.current_period - subscription_counts.previous_period)::numeric / subscription_counts.previous_period) * 100, 1) END
        ),
        'ai_calls', jsonb_build_object(
          'current', ai_counts.current_period,
          'previous', ai_counts.previous_period,
          'percent', CASE WHEN ai_counts.previous_period = 0 THEN NULL ELSE round(((ai_counts.current_period - ai_counts.previous_period)::numeric / ai_counts.previous_period) * 100, 1) END
        )
      ),
      'users', to_jsonb(user_counts),
      'facilities', jsonb_build_object(
        'total', facility_counts.total,
        'active', facility_counts.active,
        'pending', facility_counts.pending,
        'rejected', facility_counts.rejected,
        'by_region', regional_facilities.by_region
      ),
      'content', to_jsonb(content_counts),
      'fitness', to_jsonb(fitness_counts),
      'queues', to_jsonb(queue_counts),
      'operations', to_jsonb(operational_counts),
      'finance', jsonb_build_object(
        'transactions', finance_counts.transactions,
        'revenue', CASE WHEN finance_counts.transactions = 0 THEN NULL ELSE finance_counts.revenue END,
        'revenue_status', CASE WHEN finance_counts.transactions = 0 THEN 'awaiting_transaction_pipeline' ELSE 'live' END
      ),
      'subscriptions', to_jsonb(subscription_counts),
      'ai', to_jsonb(ai_counts),
      'activity', recent_activity.rows,
      'unsupported', jsonb_build_object(
        'feature_usage', NULL,
        'security_score', NULL,
        'compliance_gra', NULL,
        'vat_filing_status', NULL,
        'push_delivery_rate', NULL,
        'user_region_distribution', NULL
      )
    )
    FROM user_counts, facility_counts, content_counts, fitness_counts,
      queue_counts, operational_counts, finance_counts, subscription_counts,
      ai_counts, regional_facilities, recent_activity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_overview_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_platform_overview_metrics(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_platform_overview_metrics(text) TO authenticated, service_role;
