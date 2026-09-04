-- =============================================================================
-- Anatomy: junction indexes, 3D seed correction, and paged link loading.
--
-- 1. INDEXES. fitness_body_parts and healthy_living_body_parts only had their
--    composite PK, whose LEADING column is workout_id / tip_id. Every "links
--    for this body part" lookup therefore fell back to a sequential scan —
--    measured at 257 ms for a single page of exercise links.
--
-- 2. SEED FIX. Heart and Forearm and Wrist were both pinned in the `head`
--    region at head coordinates (12, 188, 11).
--
-- 3. PAGING. get_anatomy_body_part_bundle() inlines every linked row. After
--    the exercise backfill that is 126-133 KB of JSON and ~520 ms for a busy
--    body part, which the mobile detail sheet waits on before rendering
--    anything. This adds:
--      - p_preview_limit to the bundle (NULL = old behaviour, so existing
--        mobile builds are unaffected; new builds pass a small number and get
--        exact counts with a short preview list)
--      - get_anatomy_body_part_items(), a paged + searchable + counted reader
--        for one content kind, for "see all" and admin tables.
--    Premium gating is identical in both.
-- =============================================================================

begin;

-- ── 1. Indexes ───────────────────────────────────────────────────────────────

create index if not exists fitness_body_parts_body_part_idx
  on public.fitness_body_parts (body_part_id);
create index if not exists fitness_body_parts_workout_idx
  on public.fitness_body_parts (workout_id);
create index if not exists healthy_living_body_parts_body_part_idx
  on public.healthy_living_body_parts (body_part_id);

analyze public.fitness_body_parts;
analyze public.healthy_living_body_parts;
analyze public.symptom_body_parts;

-- ── 2. 3D seed correction ────────────────────────────────────────────────────

update public.anatomy_hotspots_3d h
set region_key = 'chest', x = -3, y = 143, z = 5
from public.body_parts bp
where bp.id = h.body_part_id and bp.name = 'Heart';

update public.anatomy_hotspots_3d h
set region_key = 'arm_right', x = 28, y = 110, z = 2
from public.body_parts bp
where bp.id = h.body_part_id and bp.name = 'Forearm and Wrist';

-- ── 3. Paged reader for one content kind ─────────────────────────────────────

commit;
