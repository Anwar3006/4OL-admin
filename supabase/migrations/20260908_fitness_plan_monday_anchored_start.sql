-- Anchor fitness_user_assignments.started_at to the Monday of the activation
-- week (today, if today already is Monday; otherwise the coming Monday).
--
-- Why: fitness_plan_days.day_number (1-7) is meant to represent a real
-- weekday-in-week position — Monday=1 ... Sunday=7, per the AI generation
-- prompt ("assign the active workouts to the exact days listed") and the
-- day_name-based fix in features/fitness/data/generate-plan.ts
-- (resolveDayNumber). The mobile client (lib/fitness-schedule.ts) derives
-- every displayed calendar date as `started_at + ((week-1)*7 + (day-1))`
-- days — so day_number's weekday meaning only lines up with real calendar
-- weekdays if started_at itself falls on a Monday. Previously started_at
-- was set to `now()` unconditionally, so a plan activated on, say, a
-- Saturday showed "Monday" content landing on the actual Saturday, and a
-- reported case where a plan's Monday/Tuesday/Wednesday workouts rendered
-- as Saturday/Sunday/Monday traced back to exactly this.
--
-- Both the fresh-INSERT and the re-activate/regenerate UPDATE paths get the
-- same anchored value. Server-clock (UTC) based, matching this function's
-- prior now()-based behavior — does not yet account for
-- user_profiles.timezone; out of scope for this fix.

CREATE OR REPLACE FUNCTION public.activate_fitness_plan(p_plan_id uuid)
 RETURNS fitness_user_assignments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_assignment_id uuid;
  v_row public.fitness_user_assignments;
  -- Monday of the activation week: today if today is already Monday,
  -- otherwise the coming Monday. isodow: 1=Monday ... 7=Sunday.
  v_started_at timestamptz := date_trunc('day', now())
    + (((8 - extract(isodow from now())::int) % 7) * interval '1 day');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'p_plan_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fitness_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Fitness plan % not found', p_plan_id;
  END IF;

  -- 1. Retire whatever else is currently active for this user, so the
  -- one-active-per-user index can't reject the activation below.
  UPDATE public.fitness_user_assignments
     SET status = 'abandoned',
         updated_at = now()
   WHERE user_id = v_user_id
     AND status = 'active'
     AND plan_id <> p_plan_id;

  -- 2. Pick the row to (re)activate. There is no unique constraint on
  -- (user_id, plan_id), so historically a user can hold more than one row
  -- for the same plan -- prefer the active one, then the most recent.
  SELECT id INTO v_assignment_id
    FROM public.fitness_user_assignments
   WHERE user_id = v_user_id
     AND plan_id = p_plan_id
   ORDER BY (status = 'active') DESC, started_at DESC
   LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Collapse any duplicates for the same plan for the same reason as (1).
    UPDATE public.fitness_user_assignments
       SET status = 'abandoned',
           updated_at = now()
     WHERE user_id = v_user_id
       AND plan_id = p_plan_id
       AND id <> v_assignment_id
       AND status = 'active';

    -- A regenerate/restart is a fresh start: the schedule is re-anchored to
    -- the activation week's Monday and progress is zeroed.
    -- usePlanCompletedDayIds filters completed sessions by started_at, so
    -- the old run's ticks drop away on their own -- nothing needs deleting
    -- from exercise_sessions.
    UPDATE public.fitness_user_assignments
       SET status = 'active',
           started_at = v_started_at,
           current_week = 1,
           current_day_number = 1,
           streak_weeks = 0,
           total_workouts_completed = 0,
           total_lbs_lifted = 0,
           total_minutes_invested = 0,
           completed_at = NULL,
           updated_at = now()
     WHERE id = v_assignment_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.fitness_user_assignments (user_id, plan_id, status, started_at)
    VALUES (v_user_id, p_plan_id, 'active', v_started_at)
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$function$;
