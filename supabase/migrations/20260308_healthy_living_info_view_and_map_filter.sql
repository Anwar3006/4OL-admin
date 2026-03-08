-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: healthy_living_info VIEW + updated map RPC with server-side filters
-- Date: 2026-03-08
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop old view if it exists
DROP VIEW IF EXISTS healthy_living_info CASCADE;

-- 2. Create healthy_living_info view
--    Adds a computed "parent_path" column that returns the ancestor chain as
--    "GrandParent → Parent" (NULL for root nodes, i.e. parent_id IS NULL).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW healthy_living_info AS
WITH RECURSIVE ancestors AS (
    -- Anchor: start from each node
    SELECT
        id,
        parent_id,
        name,
        ARRAY[]::TEXT[]   AS path_names   -- path does NOT include the node itself
    FROM healthy_living

    UNION ALL

    -- Recursive: walk up the parent chain
    SELECT
        child.id,
        parent.parent_id,
        parent.name,
        path_names || parent.name
    FROM healthy_living child
    JOIN ancestors parent ON child.parent_id = parent.id
)
SELECT
    hl.*,
    CASE
        WHEN hl.parent_id IS NULL THEN NULL
        ELSE array_to_string(ARRAY(
            SELECT elem
            FROM unnest((
                SELECT path_names
                FROM ancestors
                WHERE id = hl.id
                ORDER BY cardinality(path_names) DESC
                LIMIT 1
            )) AS elem
            -- path_names holds ancestors in bottom-to-top order, so reverse
        ), ' → ')
    END AS parent_path
FROM healthy_living hl;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Since healthy_living_info is a view backed by the healthy_living table,
-- all INSERT / UPDATE / DELETE RPCs created in the previous migration still
-- work against the underlying table directly. No changes needed to those RPCs.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop & recreate the map data RPC with server-side filter support
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_facilities_map CASCADE;

CREATE OR REPLACE FUNCTION get_facilities_map(
    minlng          FLOAT,
    minlat          FLOAT,
    maxlng          FLOAT,
    maxlat          FLOAT,
    zoom_level      INT,
    -- Optional server-side filters (NULL = no filter applied)
    p_region        TEXT    DEFAULT NULL,
    p_district      TEXT    DEFAULT NULL,
    p_facility_type TEXT    DEFAULT NULL,
    p_status        TEXT    DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    map_data    JSONB;
    fetch_limit INT;
BEGIN
    -- Determine limit based on zoom level (higher zoom = more detail)
    IF zoom_level < 10 THEN
        fetch_limit := 1000;
    ELSE
        fetch_limit := 5000;
    END IF;

    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
    ) INTO map_data
    FROM (
        SELECT jsonb_build_object(
            'type', 'Feature',
            -- ST_AsGeoJSON converts geometry to the JSON structure MapLibre expects
            'geometry', ST_AsGeoJSON(location)::jsonb,
            'properties', jsonb_build_object(
                'id',           id,
                'name',         facility_name,
                'type',         facility_type,
                'avgRating',    avg_rating,
                'status',       status,
                'region',       region,
                'district',     district
            )
        ) AS feature
        FROM facility_profile
        WHERE
            -- Spatial bounding-box filter (uses GiST index)
            location && ST_MakeEnvelope(minlng, minlat, maxlng, maxlat, 4326)
            -- Status filter (default: active only)
            AND (p_status        IS NULL OR status         =  p_status)
            -- Optional attribute filters
            AND (p_region        IS NULL OR LOWER(region)        LIKE '%' || LOWER(p_region)        || '%')
            AND (p_district      IS NULL OR LOWER(district)      LIKE '%' || LOWER(p_district)      || '%')
            AND (p_facility_type IS NULL OR LOWER(facility_type) LIKE '%' || LOWER(p_facility_type) || '%')
        LIMIT fetch_limit
    ) features;

    RETURN map_data;
END;
$$;
