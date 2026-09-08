-- ============================================================
-- Bootstrap ~300 exercises tagged tier='free' out of fitness_exercises
-- (all 3,292 original rows default to tier='pro'; nothing has ever been
-- tagged 'free'). Stratified by equipment_required (not category) since
-- that's the only dimension the workout-library browse filters
-- (useWorkouts/useWorkoutsPaginated) and the AI plan generator's exercise
-- pool actually filter on -- a pure random sample could leave a thin
-- equipment type with zero free exercises. Only samples from rows still at
-- the default 'pro' (the four sparse equipment types already got a small
-- free/pro split from scripts/generate-sparse-equipment-exercises.ts, and
-- this shouldn't re-shuffle those). Admin can retag any of this later via
-- the existing tier filter in ExercisesTab.tsx / add-exercise-dialog.tsx --
-- this is a starting point, not a final content decision.
-- ============================================================

with ranked as (
  select id, equipment_required,
         row_number() over (partition by equipment_required order by random()) as rn,
         count(*) over (partition by equipment_required) as bucket_size
  from public.fitness_exercises
  where is_active = true and status = 'published' and tier = 'pro'
)
update public.fitness_exercises fe
set tier = 'free'
from ranked r
where fe.id = r.id
  and r.rn <= greatest(least(r.bucket_size, 5), round(r.bucket_size * 0.088));
