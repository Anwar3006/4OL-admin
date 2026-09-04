-- =============================================================================
-- G1 gap-closure: source-control capture for two prod-only RPCs.
--
-- increment_condition_view_count and increment_exercise_view_count already
-- run in production (mobile has called them since the disease/fitness view
-- tracking features shipped) but existed in neither repo's migrations,
-- meaning the DB could not be rebuilt from source. Captured verbatim via
-- pg_get_functiondef against the live DB on 2026-09-04 — this is a no-op
-- CREATE OR REPLACE against the existing live definitions, not a behavior
-- change.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_condition_view_count(condition_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.condition_views (user_id, condition_id)
  VALUES (user_id_param, condition_id_param)
  ON CONFLICT (user_id, condition_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.conditions
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = condition_id_param;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_exercise_view_count(exercise_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    BEGIN
      -- Attempt to log the view (UNIQUE constraint prevents duplicates)
      INSERT INTO public.exercise_views (user_id, exercise_id)
      VALUES (user_id_param, exercise_id_param)
      ON CONFLICT (user_id, exercise_id) DO NOTHING;

      -- IF FOUND refers to the result of the INSERT statement above
      IF FOUND THEN
        UPDATE public.fitness_exercises
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE id = exercise_id_param;
      END IF;
    END;
    $function$;
