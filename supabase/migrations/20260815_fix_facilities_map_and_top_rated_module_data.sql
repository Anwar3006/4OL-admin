-- ============================================================================
-- Fix 1: get_facilities_map missing p_is_top_rated
-- ============================================================================
-- The mobile client (hooks/use-facilities.ts's useGetFacilitiesMapData) has
-- always called this RPC with a p_is_top_rated argument, but the only
-- committed/live definition of the function never declared one — every call
-- to the Maps screen failed with PGRST202 "function not found", not just
-- top-rated-filtered ones (PostgREST resolves RPCs by exact parameter set).
-- ============================================================================

drop function if exists get_facilities_map cascade;

create or replace function get_facilities_map(
    minlng          float,
    minlat          float,
    maxlng          float,
    maxlat          float,
    zoom_level      int,
    p_facility_name text    default null,
    p_region        text    default null,
    p_district      text    default null,
    p_facility_type text    default null,
    p_status        text    default 'active',
    p_is_top_rated  boolean default null
)
returns jsonb
language plpgsql
stable
as $$
declare
    map_data    jsonb;
    fetch_limit int;
begin
    if zoom_level < 10 then
        fetch_limit := 1000;
    else
        fetch_limit := 5000;
    end if;

    select jsonb_build_object(
        'type', 'FeatureCollection',
        'features', coalesce(jsonb_agg(features.feature), '[]'::jsonb)
    ) into map_data
    from (
        select jsonb_build_object(
            'type', 'Feature',
            'geometry', st_asgeojson(location)::jsonb,
            'properties', jsonb_build_object(
                'id',           id,
                'name',         facility_name,
                'type',         facility_type,
                'avgRating',    avg_rating,
                'status',       status,
                'region',       region,
                'district',     district
            )
        ) as feature
        from facility_profile
        where location && st_makeenvelope(minlng, minlat, maxlng, maxlat, 4326)
          and (p_facility_name is null or facility_name ilike '%' || p_facility_name || '%')
          and (p_region is null or region::text = p_region)
          and (p_district is null or district = p_district)
          and (p_facility_type is null or facility_type::text = p_facility_type)
          and (p_status is null or status::text = p_status)
          and (p_is_top_rated is null or is_top_rated = p_is_top_rated)
        limit fetch_limit
    ) features;

    return map_data;
end;
$$;

-- ============================================================================
-- Fix 2: top_rated_items.module_data was never populated by anything
-- ============================================================================
-- admin_upsert_top_rated_item / admin_upsert_top_rated (and every caller —
-- hooks/supabase-calls/useTopRatedItems.ts's useUpsertTopRatedItem, used by
-- both the Top Rated admin page and the per-entity TopRatedToggle) never
-- accepted or set module_data. The column exists (jsonb, with its own GIN
-- index), and the mobile TopRatedItemCard dispatcher expects it — distance/
-- duration/difficulty for outdoor routes, facility_type/NHIS/ownership for
-- facilities, etc. — so every module-specific field has been silently null
-- for every top-rated item regardless of module, showing as "--" on mobile.
--
-- Fix: derive module_data automatically from each module's own source table
-- at upsert time, keyed off p_item_id, instead of expecting the frontend to
-- know and pass per-module field mappings.
-- ============================================================================

create or replace function public.build_top_rated_module_data(p_module text, p_item_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb;
begin
  case p_module
    when 'facility' then
      select jsonb_build_object(
        'facility_type', facility_type,
        'accepts_nhis', accepts_nhis,
        'ownership', ownership
      ) into result
      from public.facility_profile where id = p_item_id;
    when 'fitness_plan' then
      select jsonb_build_object(
        'duration_weeks', duration_weeks,
        'workouts_per_week', workouts_per_week,
        'difficulty_level', difficulty_level,
        'is_premium', is_premium
      ) into result
      from public.fitness_plans where id = p_item_id;
    when 'outdoor_route' then
      select jsonb_build_object(
        'distance_km', distance_km,
        'estimated_duration_mins', estimated_duration_mins,
        'difficulty', difficulty,
        'category', category,
        'surface_type', surface_type,
        'verification_status', verification_status
      ) into result
      from public.fitness_outdoor_routes where id = p_item_id;
    when 'outdoor_event' then
      select jsonb_build_object(
        'start_at', start_at,
        'max_participants', max_participants,
        'current_participants', current_participants,
        'route_id', route_id,
        'category', category
      ) into result
      from public.fitness_outdoor_events where id = p_item_id;
    when 'challenge' then
      select jsonb_build_object(
        'challenge_type', challenge_type,
        'status', status,
        'goal_metric', goal_metric,
        'goal_value', goal_value,
        'current_participants', current_participants,
        'end_date', end_date
      ) into result
      from public.fitness_challenges where id = p_item_id;
    when 'exercise' then
      select jsonb_build_object(
        'category', category,
        'primary_muscle_group', primary_muscle_group,
        'difficulty_level', difficulty_level,
        'tier', tier
      ) into result
      from public.fitness_exercises where id = p_item_id;
    else
      result := '{}'::jsonb;
  end case;
  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.build_top_rated_module_data(text, uuid) to authenticated, service_role;

drop function if exists admin_upsert_top_rated_item(text, uuid, text, text, text, numeric, int, text, int, uuid);

create or replace function admin_upsert_top_rated_item(
  p_module TEXT,
  p_item_id UUID,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_rating_count INT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_rank INT DEFAULT NULL,
  p_added_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  module TEXT,
  item_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  rating NUMERIC,
  rating_count INT,
  source TEXT,
  rank INT,
  added_by UUID,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
    INSERT INTO public.top_rated_items (
      module, item_id, title, subtitle, image_url,
      rating, rating_count, source, rank, added_by, module_data
    )
    VALUES (
      p_module, p_item_id, p_title, p_subtitle, p_image_url,
      p_rating, p_rating_count, p_source, p_rank, p_added_by,
      public.build_top_rated_module_data(p_module, p_item_id)
    )
    ON CONFLICT (module, item_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      image_url = EXCLUDED.image_url,
      rating = EXCLUDED.rating,
      rating_count = EXCLUDED.rating_count,
      source = EXCLUDED.source,
      rank = EXCLUDED.rank,
      added_by = EXCLUDED.added_by,
      module_data = public.build_top_rated_module_data(EXCLUDED.module, EXCLUDED.item_id),
      updated_at = NOW()
    RETURNING
      top_rated_items.id,
      top_rated_items.module,
      top_rated_items.item_id,
      top_rated_items.title,
      top_rated_items.subtitle,
      top_rated_items.image_url,
      top_rated_items.rating,
      top_rated_items.rating_count,
      top_rated_items.source,
      top_rated_items.rank,
      top_rated_items.added_by,
      top_rated_items.added_at,
      top_rated_items.updated_at;
END;
$$;

drop function if exists admin_upsert_top_rated(text, uuid, text, text, text, numeric, int, text, int, uuid);

create or replace function admin_upsert_top_rated(
  p_module TEXT,
  p_item_id UUID,
  p_title TEXT,
  p_subtitle TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_rating NUMERIC DEFAULT NULL,
  p_rating_count INT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_rank INT DEFAULT NULL,
  p_added_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  module TEXT,
  item_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  rating NUMERIC,
  rating_count INT,
  source TEXT,
  rank INT,
  added_by UUID,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY SELECT * FROM public.admin_upsert_top_rated_item(
    p_module, p_item_id, p_title, p_subtitle, p_image_url,
    p_rating, p_rating_count, p_source, p_rank, p_added_by
  );
END;
$$;

-- Backfill: every currently-curated top-rated item still has module_data =
-- null from before this fix. Populate them now so mobile shows real
-- distance/duration/etc. immediately, not just on the next admin edit.
update public.top_rated_items
set module_data = public.build_top_rated_module_data(module, item_id)
where module_data is null or module_data = '{}'::jsonb;
