-- ============================================================================
-- Top Rated Items Backfill
-- ============================================================================
--
-- One-time backfill: for every facility_profile row where is_top_rated = true,
-- insert a corresponding top_rated_items row.
--
-- All existing is_top_rated = true rows are backfilled as 'manual' source
-- since there was no facility_subscriptions table to provide real enrollment.
--
-- Use `insert ... on conflict (module, item_id) do nothing` so this is safe
-- to re-run.
-- ============================================================================

INSERT INTO public.top_rated_items (
  module,
  item_id,
  title,
  subtitle,
  image_url,
  rating,
  rating_count,
  source,
  added_at,
  updated_at
)
SELECT
  'facility' as module,
  fp.id as item_id,
  fp.facility_name as title,
  fp.area as subtitle,
  fp.featured_image_url as image_url,
  fp.rating_average as rating,
  fp.rating_count as rating_count,
  'manual' as source,
  NOW() as added_at,
  NOW() as updated_at
FROM public.facility_profile fp
WHERE fp.is_top_rated = true
ON CONFLICT (module, item_id) DO NOTHING;

-- Verification query: compare counts
-- SELECT 
--   (SELECT COUNT(*) FROM facility_profile WHERE is_top_rated = true) as source_count,
--   (SELECT COUNT(*) FROM top_rated_items WHERE module = 'facility') as target_count;