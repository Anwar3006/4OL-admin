-- Epic 13/14: real facility review and support analytics.

ALTER TABLE public.chat_support
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_support_satisfaction_rating_range'
      AND conrelid = 'public.chat_support'::regclass
  ) THEN
    ALTER TABLE public.chat_support
      ADD CONSTRAINT chat_support_satisfaction_rating_range
      CHECK (satisfaction_rating IS NULL OR satisfaction_rating BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_support_response_time_non_negative'
      AND conrelid = 'public.chat_support'::regclass
  ) THEN
    ALTER TABLE public.chat_support
      ADD CONSTRAINT chat_support_response_time_non_negative
      CHECK (response_time_minutes IS NULL OR response_time_minutes >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_chat_support_first_response()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.first_response_at IS NULL AND (
    NEW.response_time_minutes IS NOT NULL
    OR NEW.assigned_to IS NOT NULL
    OR NEW.assigned_at IS NOT NULL
    OR NEW.resolution_notes IS NOT NULL
    OR NEW.resolved_at IS NOT NULL
    OR NEW.status = 'Closed'
  ) THEN
    NEW.first_response_at := COALESCE(
      NEW.assigned_at,
      NEW.resolved_at,
      NEW.updated_at,
      now()
    );
  END IF;

  IF NEW.response_time_minutes IS NULL AND NEW.first_response_at IS NOT NULL THEN
    NEW.response_time_minutes := GREATEST(
      0,
      round(extract(epoch FROM (NEW.first_response_at - NEW.created_at)) / 60)::integer
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_support_first_response ON public.chat_support;
CREATE TRIGGER trg_chat_support_first_response
BEFORE INSERT OR UPDATE ON public.chat_support
FOR EACH ROW
EXECUTE FUNCTION public.set_chat_support_first_response();

CREATE OR REPLACE FUNCTION public.get_review_kpi_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period_start timestamptz := now() - interval '30 days';
  previous_period_start timestamptz := now() - interval '60 days';
  tot_curr int; tot_prev int;
  pending_curr int; pending_prev int;
  approved_curr int; approved_prev int;
  rejected_curr int; rejected_prev int;
  average_rating numeric;
BEGIN
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status::text = 'pending')::int,
    count(*) FILTER (WHERE status::text = 'approved')::int,
    count(*) FILTER (WHERE status::text = 'rejected')::int,
    round(avg(rating)::numeric, 1)
  INTO tot_curr, pending_curr, approved_curr, rejected_curr, average_rating
  FROM public.facility_reviews
  WHERE created_at >= current_period_start;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status::text = 'pending')::int,
    count(*) FILTER (WHERE status::text = 'approved')::int,
    count(*) FILTER (WHERE status::text = 'rejected')::int
  INTO tot_prev, pending_prev, approved_prev, rejected_prev
  FROM public.facility_reviews
  WHERE created_at >= previous_period_start
    AND created_at < current_period_start;

  RETURN json_build_object(
    'total_reviews', tot_curr,
    'total_delta', CASE WHEN tot_prev = 0 THEN NULL ELSE round(((tot_curr - tot_prev)::numeric / tot_prev) * 100, 1) END,
    'average_rating', COALESCE(average_rating, 0),
    'pending_reviews', pending_curr,
    'pending_delta', CASE WHEN pending_prev = 0 THEN NULL ELSE round(((pending_curr - pending_prev)::numeric / pending_prev) * 100, 1) END,
    'approved_reviews', approved_curr,
    'approved_delta', CASE WHEN approved_prev = 0 THEN NULL ELSE round(((approved_curr - approved_prev)::numeric / approved_prev) * 100, 1) END,
    'rejected_reviews', rejected_curr,
    'rejected_delta', CASE WHEN rejected_prev = 0 THEN NULL ELSE round(((rejected_curr - rejected_prev)::numeric / rejected_prev) * 100, 1) END,
    'flagged_reviews', NULL,
    'flagged_delta', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_facility_dashboard_metrics(time_filter text DEFAULT '30')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_at timestamptz;
  review_total int;
  approved_review_total int;
  avg_rating numeric;
  top_rated_count int;
BEGIN
  start_at := CASE time_filter
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN 'year' THEN date_trunc('year', now())
    ELSE now() - interval '30 days'
  END;

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status::text = 'approved')::int,
    round(avg(rating)::numeric, 1)
  INTO review_total, approved_review_total, avg_rating
  FROM public.facility_reviews
  WHERE created_at >= start_at;

  SELECT count(*)::int
  INTO top_rated_count
  FROM (
    SELECT facility_id
    FROM public.facility_reviews
    WHERE status::text = 'approved'
    GROUP BY facility_id
    HAVING avg(rating) >= 4
  ) rated_facilities;

  RETURN jsonb_build_object(
    'facilities', (
      SELECT jsonb_build_object(
        'total', count(*)::int,
        'active', count(*) FILTER (WHERE status::text = 'active')::int,
        'pending', count(*) FILTER (WHERE status::text = 'pending')::int,
        'rejected', count(*) FILTER (WHERE status::text = 'rejected')::int
      )
      FROM public.facility_profile
    ),
    'by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', facility_type, 'count', count) ORDER BY count DESC, facility_type)
      FROM (
        SELECT facility_type, count(*)::int
        FROM public.facility_profile
        GROUP BY facility_type
      ) type_counts
    ), '[]'::jsonb),
    'by_region', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('region', region::text, 'count', count) ORDER BY count DESC, region::text)
      FROM (
        SELECT region, count(*)::int
        FROM public.facility_profile
        GROUP BY region
      ) region_counts
    ), '[]'::jsonb),
    'reviews', jsonb_build_object(
      'total', COALESCE(review_total, 0),
      'approved', COALESCE(approved_review_total, 0),
      'average_rating', COALESCE(avg_rating, 0),
      'top_rated_count', COALESCE(top_rated_count, 0),
      'has_review_data', COALESCE(review_total, 0) > 0
    ),
    'favorites_total', (SELECT count(*)::int FROM public.facility_favorites),
    'active_offerings_total', (
      SELECT count(*)::int
      FROM public.facility_offerings
      WHERE is_active IS TRUE
    ),
    'deltas', jsonb_build_object(
      'facilities', public.count_created_at_delta('public.facility_profile', 'created_at', start_at, now()),
      'reviews', public.count_created_at_delta('public.facility_reviews', 'created_at', start_at, now())
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_support_analytics(time_filter text DEFAULT '30')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_at timestamptz;
BEGIN
  start_at := CASE time_filter
    WHEN '7' THEN now() - interval '7 days'
    WHEN '30' THEN now() - interval '30 days'
    WHEN '90' THEN now() - interval '90 days'
    WHEN 'year' THEN date_trunc('year', now())
    ELSE now() - interval '30 days'
  END;

  RETURN jsonb_build_object(
    'groups', jsonb_build_object(
      'total', (
        SELECT count(*)::int
        FROM public.conversations
        WHERE is_deleted IS FALSE
          AND (is_group IS TRUE OR type = 'group')
      ),
      'members', (
        SELECT count(*)::int
        FROM public.conversation_members cm
        JOIN public.conversations c ON c.id = cm.conversation_id
        WHERE cm.left_at IS NULL
          AND c.is_deleted IS FALSE
          AND (c.is_group IS TRUE OR c.type = 'group')
      ),
      'delta', public.count_created_at_delta('public.conversations', 'created_at', start_at, now())
    ),
    'support', (
      SELECT jsonb_build_object(
        'total', count(*)::int,
        'open', count(*) FILTER (WHERE status = 'Open')::int,
        'closed', count(*) FILTER (WHERE status = 'Closed')::int,
        'unread', count(*) FILTER (WHERE status = 'Open')::int,
        'unassigned', count(*) FILTER (WHERE assigned_to IS NULL AND status = 'Open')::int,
        'sla_breaches', count(*) FILTER (
          WHERE status = 'Open'
            AND first_response_at IS NULL
            AND created_at < now() - interval '24 hours'
        )::int,
        'avg_first_response_minutes', round(avg(COALESCE(response_time_minutes, extract(epoch FROM (first_response_at - created_at)) / 60))::numeric, 1),
        'avg_resolution_minutes', round(avg(extract(epoch FROM (resolved_at - created_at)) / 60)::numeric, 1),
        'satisfaction_average', round(avg(satisfaction_rating)::numeric, 1),
        'satisfaction_count', count(satisfaction_rating)::int,
        'delta', public.count_created_at_delta('public.chat_support', 'created_at', start_at, now())
      )
      FROM public.chat_support
      WHERE (is_deleted IS FALSE OR is_deleted IS NULL)
        AND created_at >= start_at
    ),
    'by_status', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', status, 'count', count) ORDER BY count DESC, status)
      FROM (
        SELECT COALESCE(status, 'Unknown') AS status, count(*)::int
        FROM public.chat_support
        WHERE (is_deleted IS FALSE OR is_deleted IS NULL)
          AND created_at >= start_at
        GROUP BY COALESCE(status, 'Unknown')
      ) status_counts
    ), '[]'::jsonb),
    'by_priority', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('priority', priority, 'count', count) ORDER BY count DESC, priority)
      FROM (
        SELECT COALESCE(priority, 'Unknown') AS priority, count(*)::int
        FROM public.chat_support
        WHERE (is_deleted IS FALSE OR is_deleted IS NULL)
          AND created_at >= start_at
        GROUP BY COALESCE(priority, 'Unknown')
      ) priority_counts
    ), '[]'::jsonb),
    'by_category', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', category, 'count', count) ORDER BY count DESC, category)
      FROM (
        SELECT COALESCE(NULLIF(category, ''), 'Uncategorized') AS category, count(*)::int
        FROM public.chat_support
        WHERE (is_deleted IS FALSE OR is_deleted IS NULL)
          AND created_at >= start_at
        GROUP BY COALESCE(NULLIF(category, ''), 'Uncategorized')
      ) category_counts
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chat_kpi_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_groups', COALESCE((analytics->'groups'->>'total')::int, 0),
    'groups_delta', COALESCE((analytics->'groups'->'delta'->>'percent')::numeric, 0),
    'total_members', COALESCE((analytics->'groups'->>'members')::int, 0),
    'members_delta', 0,
    'unread_support', COALESCE((analytics->'support'->>'unread')::int, 0),
    'support_delta', COALESCE((analytics->'support'->'delta'->>'percent')::numeric, 0),
    'avg_response_hrs', COALESCE(round(((analytics->'support'->>'avg_first_response_minutes')::numeric / 60), 1), 0),
    'response_delta', 0
  )
  FROM public.get_support_analytics('30') AS analytics;
$$;

REVOKE ALL ON FUNCTION public.set_chat_support_first_response() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_review_kpi_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_facility_dashboard_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_support_analytics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_kpi_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_review_kpi_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_facility_dashboard_metrics(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_support_analytics(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_chat_kpi_stats() TO authenticated, service_role;
