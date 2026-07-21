-- ============================================================================
-- Top Rated Items Automatic Database Sync Trigger
-- ============================================================================
-- Whenever a top-rated item is inserted, updated, or deleted:
-- 1. Keeps facility_profile.is_top_rated in sync automatically.
-- 2. Provides real-time DB trigger guarantees across all API paths.
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
