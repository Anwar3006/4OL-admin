-- =============================================================================
-- Fitness extension (Gap Analysis Part V).
--
-- All aggregates read-only; SECURITY DEFINER + STABLE, granted to
-- authenticated/service_role (routes additionally enforce fitness.* RBAC).
--
-- 1. get_most_used_fitness_plans(p_limit)      — dashboard card (V P1)
-- 2. get_fitness_ai_log_stats(p_period_days)   — AI Log tab (V P3)
-- 3. get_fitness_users(p_limit, p_offset, p_search) — 13-column user table
-- 4. get_fitness_health_sync_stats()           — Health Integrations tab
-- 5. get_fitness_schedule_stats()              — Schedule tab heatmap
-- Additive and re-runnable.
-- =============================================================================

-- 1. Most-used plans (ranked by recorded completions) ───────────────────────
DROP FUNCTION IF EXISTS public.get_most_used_fitness_plans(int);

CREATE OR REPLACE FUNCTION public.get_most_used_fitness_plans(p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'plans', coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb)
  )
  FROM (
    SELECT id, title, difficulty_level, duration_weeks, is_premium,
           total_completions, average_rating, rating_count
    FROM public.fitness_plans
    WHERE status = 'published'
    ORDER BY total_completions DESC NULLS LAST, created_at DESC
    LIMIT greatest(p_limit, 1)
  ) p;
$$;

-- 2. AI Log stats ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_fitness_ai_log_stats(int);

CREATE OR REPLACE FUNCTION public.get_fitness_ai_log_stats(p_period_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(p_period_days, 1));
BEGIN
  RETURN jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'calls', count(*),
        'success', count(*) FILTER (WHERE status = 'success'),
        'errors', count(*) FILTER (WHERE status <> 'success'),
        'tokens', coalesce(sum(token_usage), 0),
        'estimated_cost', coalesce(sum(estimated_cost), 0),
        'avg_latency_ms', round(coalesce(avg(response_time_ms), 0))::int
      )
      FROM public.fitness_ai_calls WHERE created_at >= v_since
    ),
    'by_model', (
      SELECT coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb)
      FROM (
        SELECT model_name, count(*) AS calls,
               count(*) FILTER (WHERE status = 'success') AS success,
               coalesce(sum(token_usage), 0) AS tokens,
               coalesce(sum(estimated_cost), 0) AS estimated_cost
        FROM public.fitness_ai_calls WHERE created_at >= v_since
        GROUP BY model_name ORDER BY calls DESC
      ) m
    ),
    'recent', (
      SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      FROM (
        SELECT c.id, c.user_id, c.model_name, c.prompt_snippet, c.status,
               c.response_time_ms, c.token_usage, c.estimated_cost,
               c.error_message, c.created_at,
               trim(concat_ws(' ', up.first_name, up.last_name)) AS user_name
        FROM public.fitness_ai_calls c
        LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
        WHERE c.created_at >= v_since
        ORDER BY c.created_at DESC
        LIMIT 50
      ) r
    )
  );
END;
$$;

-- 3. Fitness users (13-column rebuild) ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_fitness_users(int, int, text);

CREATE OR REPLACE FUNCTION public.get_fitness_users(
  p_limit int DEFAULT 25, p_offset int DEFAULT 0, p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_match boolean := p_search IS NOT NULL AND trim(p_search) <> '';
  v_term  text := '%' || coalesce(trim(p_search), '') || '%';
BEGIN
  RETURN jsonb_build_object(
    'rows', (
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      FROM (
        SELECT
          fu.user_id,
          trim(concat_ws(' ', up.first_name, up.last_name)) AS name,
          up.avatar_url,
          up.status,
          coalesce(fp.title, 'No plan') AS plan,
          fu.current_level AS level,
          s.workouts,
          s.kcal,
          coalesce(up.fitcoins_balance, 0) AS fitcoins,
          coalesce(ai.ai_calls, 0) AS ai_calls,
          up.created_at AS joined_at,
          up.last_active,
          coalesce(fp.total_completions, 0) AS plan_completions
        FROM public.fitness_users fu
        JOIN public.user_profiles up ON up.user_id = fu.user_id
        LEFT JOIN public.fitness_plans fp ON fp.id = fu.fitness_plan_id
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS workouts,
                 coalesce(sum(es.kcal_burned), 0) AS kcal
          FROM public.exercise_sessions es
          WHERE es.user_id = fu.user_id AND es.status = 'completed'
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS ai_calls
          FROM public.fitness_ai_calls c
          WHERE c.user_id = fu.user_id
        ) ai ON true
        WHERE NOT v_match
           OR up.first_name ILIKE v_term
           OR up.last_name ILIKE v_term
        ORDER BY up.last_active DESC NULLS LAST
        LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0)
      ) x
    ),
    'total', (
      SELECT count(*) FROM public.fitness_users fu
      JOIN public.user_profiles up ON up.user_id = fu.user_id
      WHERE NOT v_match
         OR up.first_name ILIKE v_term
         OR up.last_name ILIKE v_term
    )
  );
END;
$$;

-- 4. Health integrations sync stats ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_fitness_health_sync_stats();

CREATE OR REPLACE FUNCTION public.get_fitness_health_sync_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'platforms', (
      SELECT coalesce(jsonb_agg(row_to_json(pl)), '[]'::jsonb)
      FROM (
        SELECT p.id, p.platform_name, p.is_enabled, p.sync_frequency_mins,
               count(l.id) FILTER (WHERE l.status = 'success') AS sync_success,
               count(l.id) FILTER (WHERE l.status = 'failure') AS sync_failures,
               max(l.synced_at) AS last_sync_at
        FROM public.fitness_health_platforms p
        LEFT JOIN public.fitness_health_sync_logs l ON l.platform_id = p.id
        GROUP BY p.id
        ORDER BY p.platform_name
      ) pl
    ),
    'recent_failures', (
      SELECT coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM (
        SELECT l.synced_at, l.status, l.error_details, l.retry_count,
               p.platform_name,
               trim(concat_ws(' ', up.first_name, up.last_name)) AS user_name
        FROM public.fitness_health_sync_logs l
        LEFT JOIN public.fitness_health_platforms p ON p.id = l.platform_id
        LEFT JOIN public.user_profiles up ON up.user_id = l.user_id
        WHERE l.status = 'failure'
        ORDER BY l.synced_at DESC
        LIMIT 20
      ) f
    )
  );
$$;

-- 5. Schedule tab: 8-week completed-session heatmap (weekday x week) ────────
DROP FUNCTION IF EXISTS public.get_fitness_schedule_stats();

CREATE OR REPLACE FUNCTION public.get_fitness_schedule_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'heatmap', (
      SELECT coalesce(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT extract(isodow FROM start_time)::int AS weekday,
               to_char(date_trunc('week', start_time), 'IYYY-"W"IW') AS week,
               count(*)::int AS sessions
        FROM public.exercise_sessions
        WHERE status = 'completed'
          AND start_time >= now() - interval '56 days'
        GROUP BY 1, 2
        ORDER BY 2, 1
      ) h
    ),
    'this_week', (
      SELECT jsonb_build_object(
        'completed', count(*) FILTER (WHERE status = 'completed'),
        'in_progress', count(*) FILTER (WHERE status = 'in_progress'),
        'abandoned', count(*) FILTER (WHERE status = 'abandoned')
      )
      FROM public.exercise_sessions
      WHERE start_time >= date_trunc('week', now())
    )
  );
$$;

-- Grants ─────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_most_used_fitness_plans(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_fitness_ai_log_stats(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_fitness_users(int, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_fitness_health_sync_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_fitness_schedule_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_most_used_fitness_plans(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fitness_ai_log_stats(int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fitness_users(int, int, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fitness_health_sync_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fitness_schedule_stats() TO authenticated, service_role;
