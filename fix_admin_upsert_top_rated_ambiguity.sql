-- ============================================================================
-- Fix Postgres Error 42702 (Ambiguous Column) & Error 42501 (RLS Policy Violation)
-- ============================================================================
-- 1. SECURITY DEFINER + SET search_path = public added to admin RPCs so they
--    execute with administrative privileges without getting blocked by RLS.
-- 2. #variable_conflict use_column added to resolve variable vs column name clashes.
-- 3. Public SELECT policy added to top_rated_items so all clients can read shelf data.
-- ============================================================================

-- Ensure top_rated_items RLS permits SELECT for all users
ALTER TABLE public.top_rated_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "top_rated_items_select" ON public.top_rated_items;
CREATE POLICY "top_rated_items_select"
    ON public.top_rated_items
    FOR SELECT
    USING (TRUE);

-- 1. admin_upsert_top_rated_item RPC
CREATE OR REPLACE FUNCTION admin_upsert_top_rated_item(
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
      module,
      item_id,
      title,
      subtitle,
      image_url,
      rating,
      rating_count,
      source,
      rank,
      added_by
    )
    VALUES (
      p_module,
      p_item_id,
      p_title,
      p_subtitle,
      p_image_url,
      p_rating,
      p_rating_count,
      p_source,
      p_rank,
      p_added_by
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

-- 2. Alias RPC: admin_upsert_top_rated
CREATE OR REPLACE FUNCTION admin_upsert_top_rated(
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
    SELECT * FROM admin_upsert_top_rated_item(
      p_module,
      p_item_id,
      p_title,
      p_subtitle,
      p_image_url,
      p_rating,
      p_rating_count,
      p_source,
      p_rank,
      p_added_by
    );
END;
$$;

-- 3. admin_remove_top_rated_item RPC
CREATE OR REPLACE FUNCTION admin_remove_top_rated_item(
  p_module TEXT,
  p_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  DELETE FROM public.top_rated_items
  WHERE top_rated_items.module = p_module
    AND top_rated_items.item_id = p_item_id;
END;
$$;

-- 4. Alias RPC: admin_remove_top_rated
CREATE OR REPLACE FUNCTION admin_remove_top_rated(
  p_module TEXT,
  p_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM admin_remove_top_rated_item(p_module, p_item_id);
END;
$$;

-- Grant permissions to executing roles
GRANT EXECUTE ON FUNCTION admin_upsert_top_rated_item TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION admin_upsert_top_rated TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION admin_remove_top_rated_item TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION admin_remove_top_rated TO authenticated, service_role, anon;

-- ============================================================================
-- 5. Trigger: sync_top_rated_facility_flag
-- ============================================================================
-- Automatically updates facility_profile.is_top_rated on insert, update, or delete
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_top_rated_facility_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.module = 'facility' THEN
      UPDATE public.facility_profile
      SET is_top_rated = TRUE,
          updated_at = NOW()
      WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.module = 'facility' THEN
      UPDATE public.facility_profile
      SET is_top_rated = FALSE,
          updated_at = NOW()
      WHERE id = OLD.item_id
        AND NOT EXISTS (
          SELECT 1 FROM public.top_rated_items
          WHERE module = 'facility' AND item_id = OLD.item_id
        );
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_top_rated_items_sync_facility ON public.top_rated_items;

CREATE TRIGGER trg_top_rated_items_sync_facility
  AFTER INSERT OR UPDATE OR DELETE ON public.top_rated_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_top_rated_facility_flag();

-- ============================================================================
-- 6. RPC: search_top_rated_items (with to_jsonb fix for text[] columns)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_top_rated_items(
  p_table_name text,
  p_search_term text default null,
  p_page int default 1,
  p_limit int default 10
)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  image_url text,
  rating_average numeric,
  rating_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_name = 'facility' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.facility_name AS title,
        fp.area AS subtitle,
        fp.featured_image_url AS image_url,
        COALESCE(fp.avg_rating, 0)::numeric AS rating_average,
        0::int AS rating_count
      FROM facility_profile fp
      WHERE (fp.status IS NULL OR LOWER(fp.status::text) IN ('active', 'approved', 'pending'))
        AND (p_search_term IS NULL OR p_search_term = '' OR 
             fp.facility_name ILIKE '%' || p_search_term || '%' OR
             fp.area ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSIF p_table_name = 'fitness_plan' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.title,
        fp.description AS subtitle,
        NULL::text AS image_url,
        COALESCE(fp.average_rating, 0)::numeric AS rating_average,
        COALESCE(fp.rating_count, 0)::int AS rating_count
      FROM fitness_plans fp
      WHERE (p_search_term IS NULL OR p_search_term = '' OR 
             fp.title ILIKE '%' || p_search_term || '%' OR
             fp.description ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSIF p_table_name = 'outdoor_route' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.name AS title,
        fp.area AS subtitle,
        (CASE WHEN array_length(fp.image_urls, 1) > 0 THEN fp.image_urls[1]::text ELSE NULL::text END) AS image_url,
        NULL::numeric AS rating_average,
        NULL::int AS rating_count
      FROM fitness_outdoor_routes fp
      WHERE (fp.is_active = TRUE OR fp.is_active IS NULL)
        AND (p_search_term IS NULL OR p_search_term = '' OR 
             fp.name ILIKE '%' || p_search_term || '%' OR
             fp.area ILIKE '%' || p_search_term || '%' OR
             fp.category ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSIF p_table_name = 'outdoor_event' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.title,
        fp.area AS subtitle,
        NULL::text AS image_url,
        NULL::numeric AS rating_average,
        NULL::int AS rating_count
      FROM fitness_outdoor_events fp
      WHERE (p_search_term IS NULL OR p_search_term = '' OR 
             fp.title ILIKE '%' || p_search_term || '%' OR
             fp.area ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSIF p_table_name = 'challenge' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.title,
        fp.description AS subtitle,
        NULL::text AS image_url,
        NULL::numeric AS rating_average,
        NULL::int AS rating_count
      FROM fitness_challenges fp
      WHERE (p_search_term IS NULL OR p_search_term = '' OR 
             fp.title ILIKE '%' || p_search_term || '%' OR
             fp.description ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSIF p_table_name = 'exercise' THEN
    RETURN QUERY
      SELECT 
        fp.id,
        fp.exercise_name AS title,
        fp.primary_muscle_group AS subtitle,
        fp.thumbnail_url AS image_url,
        NULL::numeric AS rating_average,
        NULL::int AS rating_count
      FROM fitness_exercises fp
      WHERE (p_search_term IS NULL OR p_search_term = '' OR 
             fp.exercise_name ILIKE '%' || p_search_term || '%' OR
             fp.primary_muscle_group ILIKE '%' || p_search_term || '%')
      ORDER BY fp.created_at DESC
      LIMIT p_limit OFFSET (p_page - 1) * p_limit;
    
  ELSE
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION search_top_rated_items TO authenticated, service_role, anon;


