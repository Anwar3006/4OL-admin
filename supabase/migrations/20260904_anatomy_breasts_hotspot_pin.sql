-- =============================================================================
-- 3D hotspot pin for the Breasts body part.
--
-- 20260904_anatomy_breasts_and_symptom_backfill.sql adds the taxonomy row, but
-- a body part is only tappable in the mobile 3D explorer once it has a row in
-- anatomy_hotspots_3d. Placed in the `chest` region, anterior to and slightly
-- below the Lungs and Pleura pin (x 0, y 145, z 6), offset off the midline the
-- same way the seed offsets other paired structures (e.g. Ears and Hearing).
--
-- gender='shared' matches body_parts.gender_scope for Breasts: nipple and
-- breast symptoms occur in both sexes. anatomy_hotspots_3d is UNIQUE on
-- (body_part_id, gender), so one shared row covers the female and male models.
--
-- Adjustable afterwards in Admin → Human Anatomy → 3D Pin Placement.
-- Idempotent: safe to re-run.
-- =============================================================================

insert into public.anatomy_hotspots_3d (body_part_id, region_key, gender, x, y, z, source)
select bp.id, 'chest', 'shared', 7, 140, 8, 'seed'
from public.body_parts bp
where bp.name = 'Breasts'
on conflict (body_part_id, gender) do nothing;

do $$
declare v_missing text;
begin
  select string_agg(bp.name, ', ' order by bp.name) into v_missing
  from public.body_parts bp
  where bp.level > 0
    and not exists (
      select 1 from public.anatomy_hotspots_3d h where h.body_part_id = bp.id
    );
  if v_missing is not null then
    raise notice 'body parts still without a 3D pin: %', v_missing;
  end if;
end $$;
