-- ============================================================================
-- Top Rated Items Schema Migration
-- ============================================================================
-- 
-- Investigation findings (per top-rated-refactor-plan.md Step 0):
-- 1. `facility_profile.is_top_rated` is set manually via `adminToggleFacilityTopRated`
--    in `actions/facility-admin.actions.ts` - no existing subscription-driven path.
-- 2. `avg_rating` appears to be stored (not computed) - `facility_profile` has both
--    `avg_rating` (integer) and `rating_average` (numeric) columns.
-- 3. `facility_offerings` is for patient-facing services, NOT platform subscription
--    enrollment. It has `offering_type` enum (subscription/walk-in/package/onetime_fee)
--    but this is a facility's own service offerings to patients.
-- 4. `fitness_outdoor_routes` has no rating columns currently.
-- 5. `fitness_outdoor_events` has no rating columns currently.
-- 6. `fitness_challenges` has no rating columns currently.
-- 7. `fitness_exercises` has `view_count` and `completion_count` but no rating.
-- 8. `fitness_plans` has `average_rating` and `rating_count` but no `is_top_rated`.
--
-- Only 'manual' and 'subscription' source values are needed based on current codebase.
-- ============================================================================

-- Create the top_rated_items table
CREATE TABLE public.top_rated_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Module type - only include modules that have rating signals or will be curated
    module TEXT NOT NULL CHECK (module IN ('facility', 'outdoor_route', 'outdoor_event', 'challenge', 'exercise', 'fitness_plan')),
    
    -- Source item ID - no FK constraint since it can point to different tables
    -- based on module value. Integrity enforced at application layer.
    item_id UUID NOT NULL,
    
    -- Denormalized display fields for efficient shelf rendering
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    rating NUMERIC,
    rating_count INTEGER,
    
    -- Source of this top-rated entry
    source TEXT NOT NULL CHECK (source IN ('manual', 'subscription')),
    
    -- Optional manual rank for admin ordering
    rank INTEGER,
    
    -- Audit fields
    added_by UUID REFERENCES public.user_profiles(user_id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: same item can't be top-rated twice
CREATE UNIQUE INDEX top_rated_items_module_item_unique 
    ON public.top_rated_items (module, item_id);

-- Index for per-module curation view
CREATE INDEX top_rated_items_module_idx 
    ON public.top_rated_items (module);

-- Index for shelf read/sort pattern: rank first, then rating, then added_at
CREATE INDEX top_rated_items_shelf_sort_idx 
    ON public.top_rated_items (rank, rating DESC, added_at DESC);

-- Enable RLS
ALTER TABLE public.top_rated_items ENABLE ROW LEVEL SECURITY;

-- SELECT-only for authenticated users (shared curated content)
CREATE POLICY "top_rated_items_select"
    ON public.top_rated_items
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- All writes go through admin/service-role backend only
CREATE POLICY "top_rated_items_insert"
    ON public.top_rated_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_app_admin());

CREATE POLICY "top_rated_items_update"
    ON public.top_rated_items
    FOR UPDATE
    TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

CREATE POLICY "top_rated_items_delete"
    ON public.top_rated_items
    FOR DELETE
    TO authenticated
    USING (public.is_app_admin());

-- Note: facility_profile.is_top_rated and avg_rating are NOT touched in this migration.
-- They remain live until Step 5 backfill runs and Step 2 write path is confirmed.
-- This follows the "deprecated, not deleted" pattern from the fitness plan refactor.

-- ============================================================================
-- RPC: admin_upsert_top_rated_item
-- ============================================================================
-- Upsert a top-rated item (admin only)
-- ============================================================================
create or replace function admin_upsert_top_rated_item(
  p_module text,
  p_item_id uuid,
  p_title text,
  p_subtitle text default null,
  p_image_url text default null,
  p_rating numeric default null,
  p_rating_count int default null,
  p_source text default 'manual',
  p_rank int default null,
  p_added_by uuid default null
)
returns table (
  id uuid,
  module text,
  item_id uuid,
  title text,
  subtitle text,
  image_url text,
  rating numeric,
  rating_count int,
  source text,
  rank int,
  added_by uuid,
  added_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
    insert into public.top_rated_items (
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
    values (
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
    on conflict (module, item_id)
    do update set
      title = excluded.title,
      subtitle = excluded.subtitle,
      image_url = excluded.image_url,
      rating = excluded.rating,
      rating_count = excluded.rating_count,
      source = excluded.source,
      rank = excluded.rank,
      added_by = excluded.added_by,
      updated_at = now()
    returning 
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
end;
$$;

-- Grant execute permission to authenticated users (RLS will enforce admin check)
grant execute on function admin_upsert_top_rated_item to authenticated, service_role, anon;

-- ============================================================================
-- RPC: admin_remove_top_rated_item
-- ============================================================================
-- Remove a top-rated item (admin only)
-- ============================================================================
create or replace function admin_remove_top_rated_item(
  p_module text,
  p_item_id uuid
)
returns void
language plpgsql
as $$
#variable_conflict use_column
begin
  delete from public.top_rated_items
  where top_rated_items.module = p_module
    and top_rated_items.item_id = p_item_id;
end;
$$;

-- Grant execute permission to authenticated users (RLS will enforce admin check)
grant execute on function admin_remove_top_rated_item to authenticated, service_role, anon;

-- ============================================================================
-- Trigger: update_updated_at_column
-- ============================================================================
-- Standard trigger function for updated_at columns
-- ============================================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for top_rated_items
create trigger trg_top_rated_items_updated_at
  before update on public.top_rated_items
  for each row
  execute function public.update_updated_at_column();
