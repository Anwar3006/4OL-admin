-- Migration: Fix Fitness KPIs
-- Description: This migration addresses the issue where fitness KPIs were showing 0
-- even after users enrolled in plans from the mobile app.
--
-- Root Causes:
-- 1. The `fitness_user_assignments` table was missing from the schema but referenced
--    by the API route (app/api/fitness/generate/route.ts)
-- 2. The `refresh_fitness_dashboard()` function was querying `exercise_sessions`
--    for active_plans instead of `fitness_user_assignments`
-- 3. No triggers existed to refresh the dashboard cache when relevant data changed
--
-- Fixes:
-- 1. Creates the `fitness_user_assignments` table
-- 2. Updates the `refresh_fitness_dashboard()` function to query correct tables
-- 3. Adds triggers to auto-refresh the dashboard cache

-- =============================================================================
-- 1. Create fitness_user_assignments table
-- =============================================================================
-- This table tracks which users are enrolled in which fitness plans.
-- The API route inserts here when a user enrolls in a plan from mobile.

CREATE TABLE IF NOT EXISTS public.fitness_user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.fitness_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  current_week integer NOT NULL DEFAULT 1,
  current_day_number integer NOT NULL DEFAULT 1,
  progress_percentage numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fitness_user_assignments_user_id 
  ON public.fitness_user_assignments (user_id);

CREATE INDEX IF NOT EXISTS idx_fitness_user_assignments_plan_id 
  ON public.fitness_user_assignments (plan_id);

CREATE INDEX IF NOT EXISTS idx_fitness_user_assignments_status 
  ON public.fitness_user_assignments (status);

-- Partial unique index: only one active assignment per user at a time
-- This ensures a user can only have one "active" plan at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_fitness_user_assignments_user_active 
  ON public.fitness_user_assignments (user_id) 
  WHERE status = 'active';

-- =============================================================================
-- 2. Enable RLS on fitness_user_assignments
-- =============================================================================
ALTER TABLE public.fitness_user_assignments ENABLE ROW LEVEL SECURITY;

-- Users can read their own assignments
CREATE POLICY "fitness_user_assignments_select_own"
  ON public.fitness_user_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id::text = public.request_user_id()
    OR public.is_app_admin()
  );

-- Users can insert their own assignments (or admins can insert for anyone)
CREATE POLICY "fitness_user_assignments_insert_own"
  ON public.fitness_user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id::text = public.request_user_id()
    OR public.is_app_admin()
  );

-- Users can update their own assignments
CREATE POLICY "fitness_user_assignments_update_own"
  ON public.fitness_user_assignments
  FOR UPDATE
  TO authenticated
  USING (
    user_id::text = public.request_user_id()
    OR public.is_app_admin()
  )
  WITH CHECK (
    user_id::text = public.request_user_id()
    OR public.is_app_admin()
  );

-- =============================================================================
-- 3. Update refresh_fitness_dashboard() to query correct tables
-- =============================================================================
-- The key changes:
-- - active_plans now queries fitness_user_assignments WHERE status = 'active'
-- - exercise_library_count queries fitness_exercises WHERE is_active = true AND status = 'published'

CREATE OR REPLACE FUNCTION refresh_fitness_dashboard()
RETURNS void AS $$
DECLARE
    final_payload JSONB;
BEGIN
    WITH 
    -- 1. Aggregate all scalar (single value) KPIs
    scalars AS (
        SELECT 
            (SELECT COUNT(*) FROM fitness_users) AS total_fitness_users,
            -- FIX: Query fitness_user_assignments for active plans (not exercise_sessions)
            (SELECT COUNT(*) FROM fitness_user_assignments WHERE status = 'active') AS active_plans,
            (SELECT COUNT(*) FROM fitness_challenges WHERE status = 'active') AS live_challenges,
            -- FIX: Only count active and published exercises
            (SELECT COUNT(*) FROM fitness_exercises WHERE is_active = true AND status = 'published') AS exercise_library_count,
            (SELECT COALESCE(SUM(amount), 0) FROM app_ledger WHERE category = 'fitness' AND amount > 0) AS fitcoins_issued,
            (SELECT COUNT(*) FROM fitness_generated_workouts) AS ai_generated_plans,
            -- Count active exercise sessions instead of non-existent workouts table
            (SELECT COUNT(*) FROM exercise_sessions WHERE status = 'in_progress') AS active_workouts,
            -- Use fitness_challenge_participants for avg progress instead of non-existent streak_count
            (SELECT COALESCE(AVG(progress_pct), 0)::INT FROM fitness_challenge_participants WHERE status = 'active') AS avg_streak,
            -- Calculate completion rate from exercise_sessions
            (SELECT COALESCE(
                (SELECT COUNT(*)::numeric FROM exercise_sessions WHERE status = 'completed') / 
                NULLIF((SELECT COUNT(*) FROM exercise_sessions), 0) * 100, 
                0
            )::INT) AS avg_completion
    ),
    -- 2. Aggregate Top 5 Active Challenges
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
    -- 3. Aggregate Most Used Plans (from fitness_user_assignments)
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
    -- 4. Aggregate Fitcoin Leaderboard
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
    -- 5. Aggregate Top Exercises (join with fitness_exercises to get exercise name)
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
    
    -- Assemble the final JSONB object
    SELECT jsonb_build_object(
        'metrics', (SELECT row_to_json(s) FROM scalars s),
        'top_challenges', (SELECT data FROM top_challenges),
        'most_used_plans', (SELECT data FROM top_plans),
        'fitcoin_leaderboard', (SELECT data FROM leaderboard),
        'top_exercises', (SELECT data FROM top_exercises)
    ) INTO final_payload;

    -- Update the single cache row
    UPDATE fitness_dashboard_cache 
    SET 
        kpi_payload = final_payload,
        last_updated = NOW()
    WHERE id = 1;

END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. Create trigger function to refresh dashboard on data changes
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_trigger_refresh_fitness_dashboard()
RETURNS trigger AS $$
BEGIN
    -- Refresh the dashboard cache
    PERFORM refresh_fitness_dashboard();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. Create triggers on relevant tables
-- =============================================================================

-- Trigger on fitness_user_assignments (for active_plans KPI)
DROP TRIGGER IF EXISTS trg_refresh_dashboard_on_assignment ON public.fitness_user_assignments;
CREATE TRIGGER trg_refresh_dashboard_on_assignment
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.fitness_user_assignments
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_trigger_refresh_fitness_dashboard();

-- Trigger on fitness_exercises (for exercise_library_count KPI)
DROP TRIGGER IF EXISTS trg_refresh_dashboard_on_exercise ON public.fitness_exercises;
CREATE TRIGGER trg_refresh_dashboard_on_exercise
  AFTER INSERT OR UPDATE OF is_active, status OR DELETE ON public.fitness_exercises
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_trigger_refresh_fitness_dashboard();

-- Trigger on fitness_challenges (for live_challenges KPI)
DROP TRIGGER IF EXISTS trg_refresh_dashboard_on_challenge ON public.fitness_challenges;
CREATE TRIGGER trg_refresh_dashboard_on_challenge
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.fitness_challenges
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_trigger_refresh_fitness_dashboard();

-- Trigger on fitness_users (for total_fitness_users KPI)
DROP TRIGGER IF EXISTS trg_refresh_dashboard_on_fitness_user ON public.fitness_users;
CREATE TRIGGER trg_refresh_dashboard_on_fitness_user
  AFTER INSERT OR DELETE ON public.fitness_users
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_trigger_refresh_fitness_dashboard();

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================
GRANT ALL ON public.fitness_user_assignments TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.fitness_user_assignments TO authenticated;

-- =============================================================================
-- 7. Run initial refresh to populate the cache
-- =============================================================================
SELECT refresh_fitness_dashboard();

-- =============================================================================
-- Summary of changes:
-- =============================================================================
-- 1. Created fitness_user_assignments table to track user plan enrollments
-- 2. Updated refresh_fitness_dashboard() to query:
--    - fitness_user_assignments WHERE status = 'active' for active_plans
--    - fitness_exercises WHERE is_active = true AND status = 'published' for exercise_library_count
-- 3. Added triggers to auto-refresh dashboard cache when:
--    - fitness_user_assignments changes (INSERT/UPDATE status/DELETE)
--    - fitness_exercises changes (INSERT/UPDATE is_active,status/DELETE)
--    - fitness_challenges changes (INSERT/UPDATE status/DELETE)
--    - fitness_users changes (INSERT/DELETE)
-- 4. Added RLS policies for fitness_user_assignments
-- 5. Ran initial refresh to populate cache with current data