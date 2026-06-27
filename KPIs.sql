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