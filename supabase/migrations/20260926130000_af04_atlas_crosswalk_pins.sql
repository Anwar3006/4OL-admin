-- =============================================================================
-- AF-04 — Human Atlas crosswalk + geometry-derived pin resolver
-- =============================================================================
-- Replaces the legacy 200-unit scene.html pin space with the real-world Human
-- Atlas (male BodyParts3D 4.0 + female HuBMAP HRA v1.5). The Atlas is
-- FMA-addressable: every Part carries a conceptId (FMA) and a bounds box.
--
-- Strategy (per AF-04 Addendum 2026-09-26, owner-locked):
--   * body_part_atlas_map = the crosswalk joining curated body_parts to FMA
--     concepts, per sex. This is the join key for ALL linked content
--     (conditions/symptoms/healthy-living/fitness/drugs inherit position via
--     their body_part).
--   * atlas_part_bounds = the Atlas geometry, bulk-loaded from atlas.json /
--     atlas-female.json. Pin anchors are DERIVED (bounds centroid of a
--     concept's parts), never hand-tapped — so pins are anatomically accurate.
--   * anatomy_atlas_pins = resolved anchors in Atlas metre space (Y-up), keyed
--     (body_part_id, sex). The legacy anatomy_hotspots_3d table is left intact
--     (additive) until the engine cutover.
--
-- Additive + re-runnable. Depends on: public.body_parts(id), request_user_id(),
--   is_app_admin().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.atlas_sex AS ENUM ('male','female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.atlas_map_source AS ENUM ('manual','ai','heuristic','seed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.atlas_map_status AS ENUM ('proposed','confirmed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. Atlas model catalogue (metadata for the loaded atlases)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atlas_models (
  version text NOT NULL,
  sex public.atlas_sex NOT NULL,
  source text,                       -- BodyParts3D 4.0 / HuBMAP HRA v1.5
  scope text,                        -- full / partial (female musculoskeletal)
  attribution text,                  -- CC BY 4.0 licence text
  part_count integer,
  concept_count integer,
  is_active boolean NOT NULL DEFAULT true,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version, sex)
);

-- -----------------------------------------------------------------------------
-- 3. Atlas part bounds — bulk-loaded from the atlas JSON parts[] array.
--    One row per Atlas Part (mesh chunk), real-world metres, Y-up.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atlas_part_bounds (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  atlas_version text NOT NULL,
  sex public.atlas_sex NOT NULL,
  part_id text NOT NULL,
  concept_id text NOT NULL,          -- FMA id
  system text,                       -- skeletal/muscular/... (Atlas SystemId)
  min_x double precision NOT NULL, min_y double precision NOT NULL, min_z double precision NOT NULL,
  max_x double precision NOT NULL, max_y double precision NOT NULL, max_z double precision NOT NULL,
  UNIQUE (atlas_version, part_id)
);
CREATE INDEX IF NOT EXISTS idx_atlas_part_bounds_concept
  ON public.atlas_part_bounds (sex, concept_id);

-- -----------------------------------------------------------------------------
-- 4. Crosswalk — curated body_part <-> FMA concept, per sex.
--    A body part may map to several concepts (e.g. a region covering bones).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_part_atlas_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body_part_id uuid NOT NULL REFERENCES public.body_parts(id) ON DELETE CASCADE,
  fma_concept_id text NOT NULL,
  sex public.atlas_sex NOT NULL,
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source public.atlas_map_source NOT NULL DEFAULT 'manual',
  status public.atlas_map_status NOT NULL DEFAULT 'proposed',
  reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (body_part_id, fma_concept_id, sex)
);
CREATE INDEX IF NOT EXISTS idx_body_part_atlas_map_part
  ON public.body_part_atlas_map (body_part_id, status);
CREATE INDEX IF NOT EXISTS idx_body_part_atlas_map_concept
  ON public.body_part_atlas_map (sex, fma_concept_id);

-- -----------------------------------------------------------------------------
-- 5. Resolved pins in Atlas space (metres, Y-up). Computed from the crosswalk +
--    bounds centroid. unique(body_part_id, sex) mirrors anatomy_hotspots_3d.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anatomy_atlas_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body_part_id uuid NOT NULL REFERENCES public.body_parts(id) ON DELETE CASCADE,
  sex public.atlas_sex NOT NULL,
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  z double precision NOT NULL DEFAULT 0,
  atlas_version text,
  source public.atlas_map_source NOT NULL DEFAULT 'heuristic',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (body_part_id, sex)
);

-- -----------------------------------------------------------------------------
-- 6. RLS — reads authenticated, writes admin/service only (mirrors anatomy).
-- -----------------------------------------------------------------------------
ALTER TABLE public.atlas_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_part_bounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_part_atlas_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anatomy_atlas_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atlas_read ON public.atlas_part_bounds;
CREATE POLICY atlas_read ON public.atlas_part_bounds FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS atlas_pins_read ON public.anatomy_atlas_pins;
CREATE POLICY atlas_pins_read ON public.anatomy_atlas_pins FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS atlas_models_read ON public.atlas_models;
CREATE POLICY atlas_models_read ON public.atlas_models FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS atlas_map_read ON public.body_part_atlas_map;
CREATE POLICY atlas_map_read ON public.body_part_atlas_map FOR SELECT TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_models TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_part_bounds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_part_atlas_map TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anatomy_atlas_pins TO service_role;

-- -----------------------------------------------------------------------------
-- 7. RPC — bulk-load atlas bounds from a JSON payload (the import harness posts
--    the atlas.json parts[] array). Idempotent via ON CONFLICT.
--    p_parts: jsonb array of {id, conceptId, system, bounds:[[minx,miny,minz],[maxx,maxy,maxz]]}
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.load_atlas_bounds(
  p_atlas_version text,
  p_sex public.atlas_sex,
  p_parts jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count int := 0;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.atlas_part_bounds
    (atlas_version, sex, part_id, concept_id, system,
     min_x, min_y, min_z, max_x, max_y, max_z)
  SELECT p_atlas_version, p_sex,
         e ->> 'id',
         e ->> 'conceptId',
         e ->> 'system',
         (e -> 'bounds' -> 0 ->> 0)::double precision,
         (e -> 'bounds' -> 0 ->> 1)::double precision,
         (e -> 'bounds' -> 0 ->> 2)::double precision,
         (e -> 'bounds' -> 1 ->> 0)::double precision,
         (e -> 'bounds' -> 1 ->> 1)::double precision,
         (e -> 'bounds' -> 1 ->> 2)::double precision
  FROM jsonb_array_elements(p_parts) AS e
  ON CONFLICT (atlas_version, part_id) DO UPDATE
    SET concept_id = EXCLUDED.concept_id,
        system = EXCLUDED.system,
        min_x = EXCLUDED.min_x, min_y = EXCLUDED.min_y, min_z = EXCLUDED.min_z,
        max_x = EXCLUDED.max_x, max_y = EXCLUDED.max_y, max_z = EXCLUDED.max_z;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('ok', true, 'upserted', v_count);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 8. RPC — resolve the pin anchor for one body part + sex.
--    Anchor = centroid of the union bounding box of every Atlas part belonging
--    to the concepts this body part maps to (confirmed mappings only).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_body_part_atlas_pin(
  p_body_part_id uuid,
  p_sex public.atlas_sex,
  p_atlas_version text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_min_x double precision; v_min_y double precision; v_min_z double precision;
  v_max_x double precision; v_max_y double precision; v_max_z double precision;
  v_parts int;
  v_version text := p_atlas_version;
BEGIN
  IF v_version IS NULL THEN
    SELECT version INTO v_version FROM public.atlas_models
    WHERE sex = p_sex AND is_active ORDER BY loaded_at DESC LIMIT 1;
  END IF;

  SELECT min(b.min_x), min(b.min_y), min(b.min_z),
         max(b.max_x), max(b.max_y), max(b.max_z), count(*)
  INTO v_min_x, v_min_y, v_min_z, v_max_x, v_max_y, v_max_z, v_parts
  FROM public.atlas_part_bounds b
  JOIN public.body_part_atlas_map m
    ON m.fma_concept_id = b.concept_id AND m.sex = b.sex
  WHERE b.sex = p_sex
    AND b.atlas_version = v_version
    AND m.body_part_id = p_body_part_id
    AND m.status = 'confirmed';

  IF v_parts IS NULL OR v_parts = 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'no_mapped_geometry');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'x', (v_min_x + v_max_x) / 2.0,
    'y', (v_min_y + v_max_y) / 2.0,
    'z', (v_min_z + v_max_z) / 2.0,
    'parts_used', v_parts,
    'atlas_version', v_version
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 9. RPC — recompute + persist all atlas pins for a sex (bulk).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_anatomy_atlas_pins(p_sex public.atlas_sex)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_version text;
  r record;
  v_pin json;
  v_written int := 0;
  v_skipped int := 0;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT version INTO v_version FROM public.atlas_models
  WHERE sex = p_sex AND is_active ORDER BY loaded_at DESC LIMIT 1;
  IF v_version IS NULL THEN
    RAISE EXCEPTION 'No active atlas loaded for sex %', p_sex;
  END IF;

  FOR r IN
    SELECT DISTINCT m.body_part_id
    FROM public.body_part_atlas_map m
    WHERE m.sex = p_sex AND m.status = 'confirmed'
  LOOP
    v_pin := public.resolve_body_part_atlas_pin(r.body_part_id, p_sex, v_version);
    IF (v_pin ->> 'ok')::boolean THEN
      INSERT INTO public.anatomy_atlas_pins (body_part_id, sex, x, y, z, atlas_version, source, computed_at)
      VALUES (r.body_part_id, p_sex,
              (v_pin ->> 'x')::double precision,
              (v_pin ->> 'y')::double precision,
              (v_pin ->> 'z')::double precision,
              v_version, 'heuristic', now())
      ON CONFLICT (body_part_id, sex) DO UPDATE
        SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z,
            atlas_version = EXCLUDED.atlas_version, computed_at = now();
      v_written := v_written + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('ok', true, 'sex', p_sex, 'written', v_written,
                           'skipped', v_skipped, 'atlas_version', v_version);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 10. RPC — read resolved pins for the Atlas engine (admin iframe / mobile).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_anatomy_atlas_pins(p_sex public.atlas_sex)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN json_build_object(
    'pins', coalesce((
      SELECT json_agg(json_build_object(
        'body_part_id', p.body_part_id,
        'name', bp.name,
        'x', p.x, 'y', p.y, 'z', p.z,
        'source', p.source
      ) ORDER BY bp.name)
      FROM public.anatomy_atlas_pins p
      JOIN public.body_parts bp ON bp.id = p.body_part_id
      WHERE p.sex = p_sex
    ), '[]'::json)
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 11. RPC — crosswalk coverage report (discovery / QA): how many body parts map
--     to real Atlas geometry per sex. Used to gate the engine cutover.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_atlas_crosswalk_coverage()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN json_build_object(
    'total_body_parts', (SELECT count(*) FROM public.body_parts),
    'by_sex', (
      SELECT coalesce(json_agg(json_build_object(
        'sex', s.sex,
        'mapped_body_parts', (SELECT count(DISTINCT body_part_id) FROM public.body_part_atlas_map m
                              WHERE m.sex = s.sex AND m.status = 'confirmed'),
        'confirmed_mappings', (SELECT count(*) FROM public.body_part_atlas_map m
                               WHERE m.sex = s.sex AND m.status = 'confirmed'),
        'proposed_mappings', (SELECT count(*) FROM public.body_part_atlas_map m
                              WHERE m.sex = s.sex AND m.status = 'proposed'),
        'resolved_pins', (SELECT count(*) FROM public.anatomy_atlas_pins p WHERE p.sex = s.sex),
        'atlas_concepts', (SELECT count(DISTINCT concept_id) FROM public.atlas_part_bounds b WHERE b.sex = s.sex)
      )), '[]'::json)
      FROM (VALUES ('male'::public.atlas_sex), ('female'::public.atlas_sex)) AS s(sex)
    )
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 12. Grants — epic30 pattern
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.load_atlas_bounds(text, public.atlas_sex, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_atlas_bounds(text, public.atlas_sex, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_body_part_atlas_pin(uuid, public.atlas_sex, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_body_part_atlas_pin(uuid, public.atlas_sex, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.recompute_anatomy_atlas_pins(public.atlas_sex) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_anatomy_atlas_pins(public.atlas_sex) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_anatomy_atlas_pins(public.atlas_sex) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anatomy_atlas_pins(public.atlas_sex) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_atlas_crosswalk_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_atlas_crosswalk_coverage() TO authenticated, service_role;
