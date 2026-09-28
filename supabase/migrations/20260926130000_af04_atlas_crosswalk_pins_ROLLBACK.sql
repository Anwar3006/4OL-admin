-- =============================================================================
-- ROLLBACK for 20260926130000_af04_atlas_crosswalk_pins.sql
-- =============================================================================
-- Reverses the AF-04 Atlas crosswalk + pin resolver. Legacy anatomy_hotspots_3d
-- and scene.html pin space are untouched by the forward migration, so this
-- rollback is safe to run without affecting the current live anatomy feature.
-- Re-runnable (IF EXISTS). DESTRUCTIVE to atlas_* / crosswalk / atlas pin rows.
-- =============================================================================

-- 1. Functions
DROP FUNCTION IF EXISTS public.get_atlas_crosswalk_coverage();
DROP FUNCTION IF EXISTS public.get_anatomy_atlas_pins(public.atlas_sex);
DROP FUNCTION IF EXISTS public.recompute_anatomy_atlas_pins(public.atlas_sex);
DROP FUNCTION IF EXISTS public.resolve_body_part_atlas_pin(uuid, public.atlas_sex, text);
DROP FUNCTION IF EXISTS public.load_atlas_bounds(text, public.atlas_sex, jsonb);

-- 2. Tables
DROP TABLE IF EXISTS public.anatomy_atlas_pins;
DROP TABLE IF EXISTS public.body_part_atlas_map;
DROP TABLE IF EXISTS public.atlas_part_bounds;
DROP TABLE IF EXISTS public.atlas_models;

-- 3. Enums last
DROP TYPE IF EXISTS public.atlas_map_status;
DROP TYPE IF EXISTS public.atlas_map_source;
DROP TYPE IF EXISTS public.atlas_sex;
