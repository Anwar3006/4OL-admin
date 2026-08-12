-- Epic 29 / AI usage tracking: refresh_fitness_dashboard()'s ai_generated_plans
-- metric counts fitness_generated_workouts — a table nothing has ever
-- written to (confirmed via repo-wide search in both repos). Real
-- AI-generated plans land in fitness_plans with author_type = 'ai'
-- (lib/fitness/generate-plan.ts). Same root-cause class as the
-- fitness_ai_calls logging gap fixed alongside this — an orphaned source
-- table, not a design problem.

CREATE OR REPLACE FUNCTION refresh_fitness_dashboard()
RETURNS void AS $$
DECLARE
    final_payload JSONB;
BEGIN
    WITH
    scalars AS (
        SELECT
            (SELECT COUNT(*) FROM fitness_users) AS total_fitness_users,
            (SELECT COUNT(*) FROM fitness_user_assignments WHERE status = 'active') AS active_plans,
            (SELECT COUNT(*) FROM fitness_challenges WHERE status = 'active') AS live_challenges,
            (SELECT COUNT(*) FROM fitness_exercises WHERE is_active = true AND status = 'published') AS exercise_library_count,
            (SELECT COALESCE(SUM(amount), 0) FROM app_ledger WHERE category = 'fitness' AND amount > 0) AS fitcoins_issued,
            -- FIX: was `fitness_generated_workouts` (never written to) —
            -- real AI-generated plans land in fitness_plans.
            (SELECT COUNT(*) FROM fitness_plans WHERE author_type = 'ai') AS ai_generated_plans,
            (SELECT COUNT(*) FROM exercise_sessions WHERE status = 'in_progress') AS active_workouts,
            (SELECT COALESCE(AVG(progress_pct), 0)::INT FROM fitness_challenge_participants WHERE status = 'active') AS avg_streak,
            (SELECT COALESCE(
                (SELECT COUNT(*)::numeric FROM exercise_sessions WHERE status = 'completed') /
                NULLIF((SELECT COUNT(*) FROM exercise_sessions), 0) * 100,
                0
            )::INT) AS avg_completion
    ),
    top_challenges AS (
        SELECT COALESCE(jsonb_agg(row_to_json(tc)), '[]'::jsonb) AS data
        FROM (
            SELECT id, title, current_participants
            FROM fitness_challenges
            WHERE status = 'active'
            ORDER BY current_participants DESC
            LIMIT 5
        ) tc
    ),
    top_plans AS (
        SELECT COALESCE(jsonb_agg(row_to_json(tp)), '[]'::jsonb) AS data
        FROM (
            SELECT
                fua.plan_id,
                fp.title,
                COUNT(*) as usage_count
            FROM fitness_user_assignments fua
            JOIN fitness_plans fp ON fp.id = fua.plan_id
            WHERE fua.status = 'active'
            GROUP BY fua.plan_id, fp.title
            ORDER BY usage_count DESC
            LIMIT 5
        ) tp
    ),
    leaderboard AS (
        SELECT COALESCE(jsonb_agg(row_to_json(lb)), '[]'::jsonb) AS data
        FROM (
            SELECT user_id, score, rank_position
            FROM fitness_leaderboards
            WHERE period = 'all_time'
            ORDER BY rank_position ASC
            LIMIT 5
        ) lb
    ),
    top_exercises AS (
        SELECT COALESCE(jsonb_agg(row_to_json(te)), '[]'::jsonb) AS data
        FROM (
            SELECT
                el.exercise_id,
                fe.exercise_name as name,
                COUNT(*) as completion_count
            FROM exercise_logs el
            JOIN fitness_exercises fe ON fe.id = el.exercise_id
            GROUP BY el.exercise_id, fe.exercise_name
            ORDER BY completion_count DESC
            LIMIT 5
        ) te
    )

    SELECT jsonb_build_object(
        'metrics', (SELECT row_to_json(s) FROM scalars s),
        'top_challenges', (SELECT data FROM top_challenges),
        'most_used_plans', (SELECT data FROM top_plans),
        'fitcoin_leaderboard', (SELECT data FROM leaderboard),
        'top_exercises', (SELECT data FROM top_exercises)
    ) INTO final_payload;

    UPDATE fitness_dashboard_cache
    SET
        kpi_payload = final_payload,
        last_updated = NOW()
    WHERE id = 1;

END;
$$ LANGUAGE plpgsql;

-- Refresh the cache immediately rather than waiting for the next 10-minute
-- cron tick or a triggering data change, so the corrected metric is visible
-- right away.
SELECT refresh_fitness_dashboard();
