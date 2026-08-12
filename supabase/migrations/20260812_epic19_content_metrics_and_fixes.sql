-- Epic 19: Medical Content (Diseases, Symptoms, Healthy Living, FAQ).
--
-- Fixes three live bugs found while verifying the epic's premise against
-- current code/DB, plus commits the one RPC (19.1) that already exists
-- live but was never captured in a migration file — same
-- applied-directly-not-committed pattern already seen elsewhere in this
-- repo (KPIs.sql, the medication/workout reminder cron schedules).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Fix get_healthy_living_kpi_stats() — references healthy_living_info
-- .is_featured, which 20260712_healthy_living_simplify.sql dropped
-- (that migration flattened the old parent_id tree into a plain table and
-- removed several columns, including this one). If that migration is
-- live, this RPC has been throwing "column does not exist" ever since,
-- and HealthyLivingStats.tsx has no error state (only checks
-- `isLoading || !stats`), so the KPI row is stuck in an infinite loading
-- skeleton. Drop the featured-count field entirely rather than fake it —
-- same "drop rather than fabricate" precedent Epic 19.2/19.5 already
-- established for conditions/symptoms/FAQ.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_healthy_living_kpi_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP := now() - interval '30 days';
  previous_period_start TIMESTAMP := now() - interval '60 days';

  tot_curr INT; tot_prev INT;
  pub_curr INT; pub_prev INT;

  tot_views INT;
  tot_delta NUMERIC; pub_delta NUMERIC;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'published')
  INTO tot_curr, pub_curr
  FROM public.healthy_living_info
  WHERE created_at >= current_period_start;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'published')
  INTO tot_prev, pub_prev
  FROM public.healthy_living_info
  WHERE created_at >= previous_period_start AND created_at < current_period_start;

  SELECT COALESCE(sum(view_count), 0)
  INTO tot_views
  FROM public.healthy_living_info;

  tot_delta := CASE WHEN tot_prev = 0 THEN 0 ELSE round(((tot_curr - tot_prev)::numeric / tot_prev) * 100, 1) END;
  pub_delta := CASE WHEN pub_prev = 0 THEN 0 ELSE round(((pub_curr - pub_prev)::numeric / pub_prev) * 100, 1) END;

  RETURN json_build_object(
    'total_articles', (SELECT count(*) FROM public.healthy_living_info),
    'total_delta', tot_delta,
    'published_articles', (SELECT count(*) FROM public.healthy_living_info WHERE status = 'published'),
    'published_delta', pub_delta,
    'total_views', tot_views
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Fix get_facilities_map() — hooks/supabase-calls/useFacilities.ts's
-- useGetFacilitiesMapData always sends a p_facility_name param, but the
-- only committed definition of this function (in
-- 20260308_healthy_living_info_view_and_map_filter.sql) never declared
-- one. PostgREST resolves RPC calls by exact parameter-name matching, so
-- every call — not just ones using the name filter — would fail unless an
-- undocumented newer version already exists live. Adding it here is a
-- no-op if that's already true, and a real fix if it isn't.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_facilities_map CASCADE;

CREATE OR REPLACE FUNCTION get_facilities_map(
    minlng          FLOAT,
    minlat          FLOAT,
    maxlng          FLOAT,
    maxlat          FLOAT,
    zoom_level      INT,
    -- Optional server-side filters (NULL = no filter applied)
    p_facility_name TEXT    DEFAULT NULL,
    p_region        TEXT    DEFAULT NULL,
    p_district      TEXT    DEFAULT NULL,
    p_facility_type TEXT    DEFAULT NULL,
    p_status        TEXT    DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    map_data    JSONB;
    fetch_limit INT;
BEGIN
    IF zoom_level < 10 THEN
        fetch_limit := 1000;
    ELSE
        fetch_limit := 5000;
    END IF;

    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
    ) INTO map_data
    FROM (
        SELECT jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(location)::jsonb,
            'properties', jsonb_build_object(
                'id',           id,
                'name',         facility_name,
                'type',         facility_type,
                'avgRating',    avg_rating,
                'status',       status,
                'region',       region,
                'district',     district
            )
        ) AS feature
        FROM facility_profile
        WHERE location && ST_MakeEnvelope(minlng, minlat, maxlng, maxlat, 4326)
          AND (p_facility_name IS NULL OR facility_name ILIKE '%' || p_facility_name || '%')
          AND (p_region IS NULL OR region::text = p_region)
          AND (p_district IS NULL OR district = p_district)
          AND (p_facility_type IS NULL OR facility_type::text = p_facility_type)
          AND (p_status IS NULL OR status::text = p_status)
        LIMIT fetch_limit
    ) features;

    RETURN map_data;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. get_content_dashboard_metrics(time_filter) — 19.1's RPC. Already
-- exists live (confirmed directly against the DB), but was never
-- committed to a migration file, so this just captures it in version
-- control — with one real bug fixed along the way: the live body filters
-- conditions/symptoms on `status = 'pending'`, but that value doesn't
-- exist in either table's CHECK constraint (only
-- draft/published/archived/pending_review are allowed) — so the
-- "pending" breakdown has always silently evaluated to zero. Corrected to
-- 'pending_review' to match the actual constraint.
--
-- `time_filter` is accepted for forward-compatibility with the other
-- get_*_dashboard_metrics(time_filter) RPCs, but this RPC returns lifetime
-- totals (matching what's live today) rather than a windowed count —
-- revisit if a consuming page needs period-over-period deltas.
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_content_dashboard_metrics(text);

CREATE OR REPLACE FUNCTION public.get_content_dashboard_metrics(
  time_filter text DEFAULT '30'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH
      condition_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'published')::int AS published,
          count(*) FILTER (WHERE status = 'draft')::int AS draft,
          count(*) FILTER (WHERE status = 'pending_review')::int AS pending,
          coalesce(sum(view_count), 0)::int AS total_views,
          count(*) FILTER (WHERE reviewed_at IS NOT NULL)::int AS reviewed
        FROM conditions
      ),
      symptom_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'published')::int AS published,
          count(*) FILTER (WHERE status = 'draft')::int AS draft,
          count(*) FILTER (WHERE status = 'pending_review')::int AS pending,
          coalesce(sum(view_count), 0)::int AS total_views,
          count(*) FILTER (WHERE reviewed_at IS NOT NULL)::int AS reviewed
        FROM symptoms
      ),
      healthy_living_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'published')::int AS published,
          count(*) FILTER (WHERE status = 'draft')::int AS draft,
          count(*) FILTER (WHERE status = 'archived')::int AS archived,
          coalesce(sum(view_count), 0)::int AS total_views
        FROM healthy_living_info
      ),
      faq_counts AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'published')::int AS published,
          count(*) FILTER (WHERE status = 'draft')::int AS draft,
          coalesce(sum(view_count), 0)::int AS total_views,
          coalesce(sum(helpful_count), 0)::int AS total_helpful,
          coalesce(sum(not_helpful_count), 0)::int AS total_not_helpful
        FROM faqs
      ),
      category_counts AS (
        SELECT
          (SELECT count(*)::int FROM categories) AS medical_categories,
          (SELECT count(*)::int FROM faq_categories) AS faq_categories
      )
    SELECT jsonb_build_object(
      'conditions', to_jsonb(condition_counts),
      'symptoms', to_jsonb(symptom_counts),
      'healthy_living', to_jsonb(healthy_living_counts),
      'faqs', to_jsonb(faq_counts),
      'categories', to_jsonb(category_counts)
    )
    FROM condition_counts, symptom_counts, healthy_living_counts,
      faq_counts, category_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_content_dashboard_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_content_dashboard_metrics(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_content_dashboard_metrics(text) TO authenticated, service_role;
