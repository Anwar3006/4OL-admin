-- For the Reviews/Ratings Dashboard
CREATE OR REPLACE FUNCTION get_review_kpi_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP := now() - interval '30 days';
  previous_period_start TIMESTAMP := now() - interval '60 days';
  
  tot_curr INT; tot_prev INT;
  pend_curr INT; pend_prev INT;
  rej_curr INT; rej_prev INT;
  
  tot_delta NUMERIC; pend_delta NUMERIC; rej_delta NUMERIC;
BEGIN
  -- Current 30 days stats
  SELECT 
    count(*), 
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'rejected')
  INTO tot_curr, pend_curr, rej_curr
  FROM public.facility_reviews
  WHERE created_at >= current_period_start;

  -- Previous 30 days stats
  SELECT 
    count(*), 
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'rejected')
  INTO tot_prev, pend_prev, rej_prev
  FROM public.facility_reviews
  WHERE created_at >= previous_period_start AND created_at < current_period_start;

  -- Calculate % Deltas (safeguard against division by zero)
  tot_delta := CASE WHEN tot_prev = 0 THEN 0 ELSE round(((tot_curr - tot_prev)::numeric / tot_prev) * 100, 1) END;
  pend_delta := CASE WHEN pend_prev = 0 THEN 0 ELSE round(((pend_curr - pend_prev)::numeric / pend_prev) * 100, 1) END;
  rej_delta := CASE WHEN rej_prev = 0 THEN 0 ELSE round(((rej_curr - rej_prev)::numeric / rej_prev) * 100, 1) END;

  -- Return as a formatted JSON object
  RETURN json_build_object(
    'total_reviews', tot_curr,
    'total_delta', tot_delta,
    'pending_reviews', pend_curr,
    'pending_delta', pend_delta,
    'flagged_reviews', rej_curr,
    'flagged_delta', rej_delta
  );
END;
$$;

---

-- Medication Reminder
-- 1. Create the ENUM type for adherence
CREATE TYPE public.adherence_status AS ENUM ('taken', 'skipped', 'missed');

-- 2. Create the adherence tracking table
CREATE TABLE public.medication_adherence (
  id uuid not null default gen_random_uuid(),
  reminder_id uuid not null,
  user_id uuid not null, -- Stored here for faster queries without joining reminders table
  status public.adherence_status not null default 'missed',
  scheduled_time timestamp with time zone not null, -- When they were SUPPOSED to take it
  action_time timestamp with time zone, -- When they ACTUALLY clicked taken/skipped
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  constraint medication_adherence_pkey primary key (id),
  constraint medication_adherence_reminder_id_fkey foreign KEY (reminder_id) references medication_reminders (id) on delete CASCADE,
  -- Assuming you have user_profiles, uncomment below if applicable:
  -- constraint medication_adherence_user_id_fkey foreign KEY (user_id) references user_profiles (user_id) on delete CASCADE,
  
  -- Prevent duplicate logs for the exact same scheduled pill
  constraint unique_reminder_schedule unique (reminder_id, scheduled_time) 
) TABLESPACE pg_default;

-- 3. Indexes for fast KPI aggregations
CREATE INDEX IF NOT EXISTS idx_medication_adherence_status ON public.medication_adherence USING btree (status);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_time ON public.medication_adherence USING btree (scheduled_time);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_user ON public.medication_adherence USING btree (user_id);

CREATE OR REPLACE FUNCTION get_medication_kpi_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP := now() - interval '30 days';
  previous_period_start TIMESTAMP := now() - interval '60 days';
  
  tot_curr INT; tot_prev INT;
  act_curr INT; act_prev INT;
  
  -- Adherence variables
  taken_curr INT; total_adh_curr INT; rate_curr NUMERIC := 0;
  taken_prev INT; total_adh_prev INT; rate_prev NUMERIC := 0;
  
  -- Deltas
  tot_delta NUMERIC; act_delta NUMERIC; rate_delta NUMERIC;
BEGIN
  -- 1. Total Reminders (Created in period)
  SELECT count(*) INTO tot_curr FROM public.medication_reminders WHERE created_at >= current_period_start;
  SELECT count(*) INTO tot_prev FROM public.medication_reminders WHERE created_at >= previous_period_start AND created_at < current_period_start;

  -- 2. Active Reminders (Created and active in period)
  SELECT count(*) INTO act_curr FROM public.medication_reminders WHERE is_active = true AND is_enabled = true AND created_at >= current_period_start;
  SELECT count(*) INTO act_prev FROM public.medication_reminders WHERE is_active = true AND is_enabled = true AND created_at >= previous_period_start AND created_at < current_period_start;

  -- 3. Adherence Rates
  -- Current 30 days
  SELECT 
    count(*) FILTER (WHERE status = 'taken'),
    count(*)
  INTO taken_curr, total_adh_curr
  FROM public.medication_adherence
  WHERE scheduled_time >= current_period_start;

  -- Previous 30 days
  SELECT 
    count(*) FILTER (WHERE status = 'taken'),
    count(*)
  INTO taken_prev, total_adh_prev
  FROM public.medication_adherence
  WHERE scheduled_time >= previous_period_start AND scheduled_time < current_period_start;

  -- Calculate Rates (Safeguard division by zero)
  IF total_adh_curr > 0 THEN rate_curr := round((taken_curr::numeric / total_adh_curr) * 100, 1); END IF;
  IF total_adh_prev > 0 THEN rate_prev := round((taken_prev::numeric / total_adh_prev) * 100, 1); END IF;

  -- 4. Calculate Deltas
  tot_delta := CASE WHEN tot_prev = 0 THEN 0 ELSE round(((tot_curr - tot_prev)::numeric / tot_prev) * 100, 1) END;
  act_delta := CASE WHEN act_prev = 0 THEN 0 ELSE round(((act_curr - act_prev)::numeric / act_prev) * 100, 1) END;
  rate_delta := rate_curr - rate_prev; -- Point difference for rates

  -- 5. Return JSON (We return total lifetime counts for the main display, but use deltas from recent activity)
  RETURN json_build_object(
    'total_reminders', (SELECT count(*) FROM public.medication_reminders),
    'total_delta', tot_delta,
    'active_reminders', (SELECT count(*) FROM public.medication_reminders WHERE is_active = true AND is_enabled = true),
    'active_delta', act_delta,
    'adherence_rate', rate_curr,
    'adherence_delta', rate_delta
  );
END;
$$;

------------------

CREATE OR REPLACE FUNCTION get_healthy_living_kpi_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP := now() - interval '30 days';
  previous_period_start TIMESTAMP := now() - interval '60 days';
  
  tot_curr INT; tot_prev INT;
  pub_curr INT; pub_prev INT;
  
  tot_views INT; featured_count INT;
  tot_delta NUMERIC; pub_delta NUMERIC;
BEGIN
  -- 1. Creation stats for current 30 days
  SELECT 
    count(*), 
    count(*) FILTER (WHERE status = 'published')
  INTO tot_curr, pub_curr
  FROM public.healthy_living_info
  WHERE created_at >= current_period_start;

  -- 2. Creation stats for previous 30 days
  SELECT 
    count(*), 
    count(*) FILTER (WHERE status = 'published')
  INTO tot_prev, pub_prev
  FROM public.healthy_living_info
  WHERE created_at >= previous_period_start AND created_at < current_period_start;

  -- 3. Lifetime totals for views and featured items
  SELECT 
    COALESCE(sum(view_count), 0),
    count(*) FILTER (WHERE is_featured = true)
  INTO tot_views, featured_count
  FROM public.healthy_living_info;

  -- 4. Calculate Deltas
  tot_delta := CASE WHEN tot_prev = 0 THEN 0 ELSE round(((tot_curr - tot_prev)::numeric / tot_prev) * 100, 1) END;
  pub_delta := CASE WHEN pub_prev = 0 THEN 0 ELSE round(((pub_curr - pub_prev)::numeric / pub_prev) * 100, 1) END;

  -- 5. Return JSON object
  RETURN json_build_object(
    'total_articles', (SELECT count(*) FROM public.healthy_living_info),
    'total_delta', tot_delta,
    'published_articles', (SELECT count(*) FROM public.healthy_living_info WHERE status = 'published'),
    'published_delta', pub_delta,
    'total_views', tot_views,
    'featured_articles', featured_count
  );
END;
$$;

---------
-- For the Fitness KPI Dashboard we need to add these 2 tables to the db to track leaderboard stats and an append-only ledger for coins
---------
-- Create the initial ENUM with your core modules
CREATE TYPE ledger_category AS ENUM ('fitness', 'medication', 'facility', 'general');
CREATE TABLE app_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, 
    category ledger_category NOT NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Supports decimals if needed, or change to INT for whole coins
    transaction_type VARCHAR(50) NOT NULL, -- e.g., 'challenge_reward', 'medication_logged'
    reference_id UUID, -- Polymorphic relation to a challenge_id, facility_id, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Primary composite index for the dashboard RPC (filters by user, module, and time)
CREATE INDEX idx_app_ledger_user_category_date 
ON app_ledger (user_id, category, created_at DESC);

-- Index for quickly calculating module-wide totals (e.g., total fitness coins issued platform-wide)
CREATE INDEX idx_app_ledger_category_date 
ON app_ledger (category, created_at DESC);

-- Index for fast lookups of specific transaction references
CREATE INDEX idx_app_ledger_reference 
ON app_ledger (reference_id);

CREATE TABLE fitness_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    score INT NOT NULL DEFAULT 0,
    period VARCHAR(20) NOT NULL, -- e.g., 'weekly', 'monthly', 'all_time'
    rank_position INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensures a user only has one active rank per period type
CREATE UNIQUE INDEX idx_fitness_leaderboards_user_period 
ON fitness_leaderboards (user_id, period);

-------
-- RLS: app_ledger and fitness_leaderboards
-- Reuses public.request_user_id() / public.is_app_admin() (see RLS.md).
-- app_ledger is append-only (per its comment above), so users get
-- select + insert on their own rows only — no update/delete policy is
-- defined, which means Postgres denies those operations by default for
-- non-admins even with RLS enabled. Admins bypass via is_app_admin().
-------
ALTER TABLE public.app_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_ledger_select"
ON public.app_ledger
FOR SELECT
TO authenticated
USING (
  user_id::text = public.request_user_id()
  OR public.is_app_admin()
);

CREATE POLICY "app_ledger_insert"
ON public.app_ledger
FOR INSERT
TO authenticated
WITH CHECK (
  user_id::text = public.request_user_id()
  OR public.is_app_admin()
);

-------
-- fitness_leaderboards: scores get upserted as they change (unique on
-- user_id, period), so users also get update on their own row. Reading
-- a leaderboard only makes sense if everyone can see everyone's rank,
-- so select is open to all authenticated users rather than scoped to
-- user_id.
-------
ALTER TABLE public.fitness_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fitness_leaderboards_select"
ON public.fitness_leaderboards
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "fitness_leaderboards_insert"
ON public.fitness_leaderboards
FOR INSERT
TO authenticated
WITH CHECK (
  user_id::text = public.request_user_id()
  OR public.is_app_admin()
);

CREATE POLICY "fitness_leaderboards_update"
ON public.fitness_leaderboards
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

-------
--- Instead of a traditional Materialized View, the most efficient pattern for a Node.js backend serving a dashboard API is to use a Single-Row JSONB Cache Table. 
--- The RPC computes the complex aggregations, packages them into a single JSON object, and stores it in one row. 
--- When your API endpoint requests the dashboard data, it performs an $O(1)$ lookup, returning the data instantly without further serialization.
-------
CREATE TABLE fitness_dashboard_cache (
    id INT PRIMARY KEY DEFAULT 1,
    kpi_payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint ensures this table only ever holds one row (id = 1)
    CONSTRAINT single_row_cache CHECK (id = 1) 
);

-- Insert an empty initial state
INSERT INTO fitness_dashboard_cache (id, kpi_payload) VALUES (1, '{}');

--- This function uses Common Table Expressions (CTEs) to independently gather the scalar KPIs and the array-based top lists, before rolling them up into a single JSONB payload.
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
            (SELECT COUNT(*) FROM exercise_sessions WHERE status = 'in_progress') AS active_plans,
            (SELECT COUNT(*) FROM fitness_challenges WHERE status = 'published') AS live_challenges,
            (SELECT COUNT(*) FROM fitness_exercises) AS exercise_library_count,
            (SELECT COALESCE(SUM(amount), 0) FROM app_ledger WHERE category = 'fitness' AND amount > 0) AS fitcoins_issued,
            (SELECT COUNT(*) FROM fitness_generated_workouts) AS ai_generated_plans,
            (SELECT COUNT(*) FROM workouts WHERE is_active = true) AS active_workouts,
            (SELECT COALESCE(AVG(streak_count), 0)::INT FROM fitness_users) AS avg_streak,
            (SELECT COALESCE(AVG(completion_percentage), 0)::INT FROM exercise_sessions) AS avg_completion
    ),
    -- 2. Aggregate Top 5 Active Challenges
    top_challenges AS (
        SELECT COALESCE(jsonb_agg(row_to_json(tc)), '[]'::jsonb) AS data
        FROM (
            SELECT id, title, participants_count 
            FROM fitness_challenges 
            WHERE status = 'published' -- or is_active = true
            ORDER BY participants_count DESC 
            LIMIT 5
        ) tc
    ),
    -- 3. Aggregate Most Used Plans
    top_plans AS (
        SELECT COALESCE(jsonb_agg(row_to_json(tp)), '[]'::jsonb) AS data
        FROM (
            SELECT plan_id, title, COUNT(*) as usage_count
            FROM exercise_sessions 
            GROUP BY plan_id, title
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
    -- 5. Aggregate Top Exercises
    top_exercises AS (
        SELECT COALESCE(jsonb_agg(row_to_json(te)), '[]'::jsonb) AS data
        FROM (
            SELECT exercise_id, name, COUNT(*) as completion_count
            FROM exercise_logs 
            GROUP BY exercise_id, name
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

-- Run the aggregation every 10 minutes
SELECT cron.schedule('refresh_fitness_dashboard_job', '*/10 * * * *', 'SELECT refresh_fitness_dashboard()');

--- this simple RPC will fetch the single JSONB payload
CREATE OR REPLACE FUNCTION get_fitness_dashboard_kpis()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT kpi_payload INTO result
    FROM fitness_dashboard_cache
    WHERE id = 1;

    -- Return an empty JSON object if the cache is somehow empty, preventing frontend crashes
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Chat / Conversations KPI Stats
-- =============================================================================
-- Aggregates:
--   total_groups       — count of non-deleted group conversations
--   total_members      — sum of member counts across all groups
--   unread_support     — count of open (unresolved) support tickets
--   avg_response_hrs   — average hours to close a support ticket
--   groups_delta       — % change in group creation (30d vs previous 30d)
--   members_delta      — % change in total members (30d vs previous 30d)
--   support_delta      — % change in open tickets (30d vs previous 30d)
--   response_delta     — point change in avg response hours
-- =============================================================================
CREATE OR REPLACE FUNCTION get_chat_kpi_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP := now() - interval '30 days';
  previous_period_start TIMESTAMP := now() - interval '60 days';

  -- Lifetime totals
  total_groups INT;
  total_members INT;
  unread_support INT;
  avg_response_hrs NUMERIC;

  -- Period-over-period
  groups_curr INT; groups_prev INT;
  members_curr INT; members_prev INT;
  support_curr INT; support_prev INT;
  resp_curr NUMERIC; resp_prev NUMERIC;

  -- Deltas
  groups_delta NUMERIC;
  members_delta NUMERIC;
  support_delta NUMERIC;
  response_delta NUMERIC;
BEGIN
  -- 1. Lifetime totals
  SELECT count(*) INTO total_groups
  FROM public.conversations
  WHERE type = 'group' AND is_deleted = false;

  SELECT COALESCE(sum(cnt), 0) INTO total_members
  FROM (
    SELECT count(*) AS cnt
    FROM public.conversation_members cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE c.type = 'group' AND c.is_deleted = false
      AND cm.left_at IS NULL
    GROUP BY cm.conversation_id
  ) sub;

  SELECT count(*) INTO unread_support
  FROM public.chat_support
  WHERE status = 'Open' AND (is_deleted = false OR is_deleted IS NULL);

  SELECT COALESCE(
    round(avg(extract(epoch FROM (updated_at - created_at)) / 3600), 1), 0
  ) INTO avg_response_hrs
  FROM public.chat_support
  WHERE status = 'Closed' AND updated_at > created_at
    AND (is_deleted = false OR is_deleted IS NULL);

  -- 2. Current 30-day period
  SELECT count(*) INTO groups_curr
  FROM public.conversations
  WHERE type = 'group' AND is_deleted = false
    AND created_at >= current_period_start;

  SELECT COALESCE(sum(cnt), 0) INTO members_curr
  FROM (
    SELECT count(*) AS cnt
    FROM public.conversation_members cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE c.type = 'group' AND c.is_deleted = false
      AND cm.left_at IS NULL
      AND cm.joined_at >= current_period_start
    GROUP BY cm.conversation_id
  ) sub;

  SELECT count(*) INTO support_curr
  FROM public.chat_support
  WHERE status = 'Open' AND (is_deleted = false OR is_deleted IS NULL)
    AND created_at >= current_period_start;

  SELECT COALESCE(
    round(avg(extract(epoch FROM (updated_at - created_at)) / 3600), 1), 0
  ) INTO resp_curr
  FROM public.chat_support
  WHERE status = 'Closed' AND updated_at > created_at
    AND (is_deleted = false OR is_deleted IS NULL)
    AND created_at >= current_period_start;

  -- 3. Previous 30-day period
  SELECT count(*) INTO groups_prev
  FROM public.conversations
  WHERE type = 'group' AND is_deleted = false
    AND created_at >= previous_period_start AND created_at < current_period_start;

  SELECT COALESCE(sum(cnt), 0) INTO members_prev
  FROM (
    SELECT count(*) AS cnt
    FROM public.conversation_members cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE c.type = 'group' AND c.is_deleted = false
      AND cm.left_at IS NULL
      AND cm.joined_at >= previous_period_start AND cm.joined_at < current_period_start
    GROUP BY cm.conversation_id
  ) sub;

  SELECT count(*) INTO support_prev
  FROM public.chat_support
  WHERE status = 'Open' AND (is_deleted = false OR is_deleted IS NULL)
    AND created_at >= previous_period_start AND created_at < current_period_start;

  SELECT COALESCE(
    round(avg(extract(epoch FROM (updated_at - created_at)) / 3600), 1), 0
  ) INTO resp_prev
  FROM public.chat_support
  WHERE status = 'Closed' AND updated_at > created_at
    AND (is_deleted = false OR is_deleted IS NULL)
    AND created_at >= previous_period_start AND created_at < current_period_start;

  -- 4. Calculate deltas
  groups_delta := CASE WHEN groups_prev = 0 THEN 0 ELSE round(((groups_curr - groups_prev)::numeric / groups_prev) * 100, 1) END;
  members_delta := CASE WHEN members_prev = 0 THEN 0 ELSE round(((members_curr - members_prev)::numeric / members_prev) * 100, 1) END;
  support_delta := CASE WHEN support_prev = 0 THEN 0 ELSE round(((support_curr - support_prev)::numeric / support_prev) * 100, 1) END;
  response_delta := round(resp_curr - resp_prev, 1);

  -- 5. Return JSON
  RETURN json_build_object(
    'total_groups', total_groups,
    'groups_delta', groups_delta,
    'total_members', total_members,
    'members_delta', members_delta,
    'unread_support', unread_support,
    'support_delta', support_delta,
    'avg_response_hrs', avg_response_hrs,
    'response_delta', response_delta
  );
END;
$$;

-- =============================================================================
-- Chat Tab Counts (for live badge counts in the tab bar)
-- Returns:
--   total_groups  INT  — count of non-deleted group conversations
--   open_support  INT  — count of open support tickets
--   pending_flags INT  — count of content_moderation_flags with status = 'pending_review'
-- =============================================================================
CREATE OR REPLACE FUNCTION get_chat_tab_counts()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  total_groups INT;
  open_support INT;
  pending_flags INT;
BEGIN
  SELECT count(*) INTO total_groups
  FROM public.conversations
  WHERE type = 'group' AND is_deleted = false;

  SELECT count(*) INTO open_support
  FROM public.chat_support
  WHERE status = 'Open' AND (is_deleted = false OR is_deleted IS NULL);

  SELECT count(*) INTO pending_flags
  FROM public.content_moderation_flags
  WHERE status = 'pending_review';

  RETURN json_build_object(
    'total_groups', total_groups,
    'open_support', open_support,
    'pending_flags', pending_flags
  );
END;
$$;