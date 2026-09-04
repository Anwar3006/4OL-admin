-- =============================================================================
-- Anatomy: backfill fitness_body_parts from fitness_exercises.
--
-- fitness_body_parts was empty (0 of 3,292 exercises linked), so the
-- `workouts` bucket of get_anatomy_body_part_bundle() always came back empty
-- and the mobile body-part sheet showed no exercises.
--
-- fitness_exercises.primary_muscle_group has only 13 distinct values, so the
-- whole catalog maps deterministically onto the musculoskeletal body parts.
-- Rows are written with source='heuristic' so they can be audited or reverted
-- separately from hand-curated source='manual' rows and AI-approved
-- source='ai' rows, neither of which this migration touches.
--
-- Requires the `Breasts` body part from
-- 20260904_anatomy_breasts_and_symptom_backfill.sql — run that first.
--
-- Idempotent: safe to re-run. Only links exercises that have none.
-- =============================================================================

begin;

with candidates as (
  select fe.id, fe.primary_muscle_group
  from public.fitness_exercises fe
  where fe.is_active = true
    and not exists (
      select 1 from public.fitness_body_parts fbp where fbp.workout_id = fe.id
    )
),
mapping (muscle_group, body_part_name) as (
  values
    ('Back',           'Thoracic Spine (Mid-back)'),
    ('Core',           'Lumbar Spine (Lower-back)'),
    ('Glutes',         'Hip and Pelvic Girdle'),
    ('Hips',           'Hip and Pelvic Girdle'),
    -- Legs fans out: most leg work loads the thigh and the knee together.
    ('Legs',           'Thigh (Femur)'),
    ('Legs',           'Knee Joint'),
    -- Chest fans out: the Body Map has no thorax region, so pectoral work
    -- attaches to the shoulder girdle and to Breasts (the overlying tissue).
    ('Chest',          'Shoulder and Clavicle'),
    ('Chest',          'Breasts'),
    ('Shoulders',      'Shoulder and Clavicle'),
    ('Biceps',         'Upper Arm (Humerus)'),
    ('Triceps',        'Upper Arm (Humerus)'),
    ('Forearms',       'Forearm and Wrist'),
    ('Flexibility',    'Musculoskeletal System'),
    ('Full Body',      'Musculoskeletal System'),
    ('Cardiovascular', 'Heart')
)
insert into public.fitness_body_parts (workout_id, body_part_id, source)
select c.id, bp.id, 'heuristic'
from candidates c
join mapping m on m.muscle_group = c.primary_muscle_group
join public.body_parts bp on bp.name = m.body_part_name
on conflict (workout_id, body_part_id) do nothing;

-- ── Verification ─────────────────────────────────────────────────────────────

do $$
declare
  v_total    int;
  v_linked   int;
  v_rows     int;
  v_orphans  text;
begin
  select count(*) into v_total  from public.fitness_exercises where is_active;
  select count(*) into v_rows   from public.fitness_body_parts;
  select count(distinct workout_id) into v_linked from public.fitness_body_parts;

  -- Muscle groups that matched no body part (e.g. a new value added to the
  -- catalog after this migration was written).
  select string_agg(distinct fe.primary_muscle_group, ', ') into v_orphans
  from public.fitness_exercises fe
  where fe.is_active
    and not exists (
      select 1 from public.fitness_body_parts fbp where fbp.workout_id = fe.id
    );

  raise notice 'fitness_body_parts: % links across % of % active exercises',
    v_rows, v_linked, v_total;
  if v_orphans is not null then
    raise notice 'unmapped muscle groups: %', v_orphans;
  end if;
end $$;

commit;
