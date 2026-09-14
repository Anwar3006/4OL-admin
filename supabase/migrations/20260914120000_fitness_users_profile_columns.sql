-- =============================================================================
-- Fitness Users table: onboarding profile columns + real per-user plan %
--
-- Extends get_fitness_users(). Built on the CURRENT schema, not the
-- 20260821_fitness_extension.sql version of this function -- that table
-- (public.fitness_users) was retired in 20260903_retire_fitness_users_table.sql
-- in favor of public.fitness_member_ids() (the canonical "who is a fitness
-- user" resolver) and public.fitness_user_assignments (current plan
-- assignment). A first pass at this migration was mistakenly written
-- against the stale 20260821 shape and briefly broke the live function
-- (`relation "public.fitness_users" does not exist`) before being
-- corrected here.
--
-- Two fixes on top of the rebase:
--
-- 1. Body Type / Goals were never surfaced in the admin Users table even
--    though the mobile app already collects them at onboarding
--    (fitness_onboarding_selections.body_type / .fitness_goals). Adding a
--    left join is a pure read addition -- that table's contracted columns
--    (tests/contract/mobile-contract.ts) are untouched. `level` also now
--    comes from fitness_onboarding_selections.fitness_level -- the
--    fitness_users.current_level column it used to read no longer exists
--    post-retirement, and onboarding's fitness_level is the only
--    surviving "experience level" concept.
--
-- 2. plan_completions used to select fitness_plans.total_completions -- the
--    PLAN's global completion count across every user who ever did it, not
--    this user's own progress. Replaced with plan_completion_pct: this
--    user's own completed exercise_sessions tied to their current
--    assignment's plan, divided by that plan's total session count
--    (duration_weeks * workouts_per_week -- fitness_plans has no dedicated
--    session-count column), clamped to 100.
--
-- Additive and re-runnable.
-- =============================================================================

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
          fm.user_id,
          trim(concat_ws(' ', up.first_name, up.last_name)) AS name,
          up.avatar_url,
          up.status,
          coalesce(fp.title, 'No plan') AS plan,
          fos.fitness_level AS level,
          fos.body_type,
          coalesce(fos.fitness_goals, '{}') AS fitness_goals,
          s.workouts,
          s.kcal,
          coalesce(up.fitcoins_balance, 0) AS fitcoins,
          coalesce(ai.ai_calls, 0) AS ai_calls,
          fm.first_seen AS joined_at,
          up.last_active,
          CASE
            WHEN fp.id IS NULL OR fp.duration_weeks IS NULL OR fp.workouts_per_week IS NULL
              OR fp.duration_weeks * fp.workouts_per_week = 0
              THEN 0
            ELSE least(
              100,
              round(
                100.0 * coalesce(ps.completed, 0)
                / (fp.duration_weeks * fp.workouts_per_week)
              )
            )
          END::int AS plan_completion_pct
        FROM public.fitness_member_ids() fm
        JOIN public.user_profiles up ON up.user_id = fm.user_id
        LEFT JOIN public.fitness_onboarding_selections fos ON fos.user_id = fm.user_id
        LEFT JOIN LATERAL (
          SELECT a.plan_id
          FROM public.fitness_user_assignments a
          WHERE a.user_id = fm.user_id
          ORDER BY (a.status = 'active') DESC, a.started_at DESC
          LIMIT 1
        ) fua ON true
        LEFT JOIN public.fitness_plans fp ON fp.id = fua.plan_id
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS workouts,
                 coalesce(sum(es.kcal_burned), 0) AS kcal
          FROM public.exercise_sessions es
          WHERE es.user_id = fm.user_id AND es.status = 'completed'
        ) s ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS completed
          FROM public.exercise_sessions es
          WHERE es.user_id = fm.user_id
            AND es.plan_id = fua.plan_id
            AND es.status = 'completed'
        ) ps ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS ai_calls
          FROM public.fitness_ai_calls c
          WHERE c.user_id = fm.user_id
        ) ai ON true
        WHERE NOT v_match
           OR up.first_name ILIKE v_term
           OR up.last_name ILIKE v_term
        ORDER BY up.last_active DESC NULLS LAST
        LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0)
      ) x
    ),
    'total', (
      SELECT count(*) FROM public.fitness_member_ids() fm
      JOIN public.user_profiles up ON up.user_id = fm.user_id
      WHERE NOT v_match
         OR up.first_name ILIKE v_term
         OR up.last_name ILIKE v_term
    )
  );
END;
$$;
