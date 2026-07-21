-- ============================================================================
-- Complete Top Rated Items Migration
-- ============================================================================
-- This file combines all necessary SQL for the top-rated feature:
-- 1. RLS Helper Functions (is_app_admin, request_user_id, update_updated_at_column)
-- 2. top_rated_items table
-- 3. facility_subscriptions table
-- 4. facility_has_privilege function
-- 5. admin_upsert_top_rated_item RPC
-- 6. admin_remove_top_rated_item RPC
-- 7. search_top_rated_items RPC
-- ============================================================================

-- ============================================================================
-- 1. RLS Helper Functions
-- ============================================================================

-- Standardize "who is calling?"
create or replace function public.request_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text
$$;

-- Centralize role checks
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = public.request_user_id()
      and up.role in ('admin', 'super_admin')
  );
$$;

-- Standard trigger function for updated_at columns
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Grant execute permissions
grant execute on function public.request_user_id() to anon, authenticated;
grant execute on function public.is_app_admin() to anon, authenticated;
grant execute on function public.update_updated_at_column() to anon, authenticated;

-- ============================================================================
-- 2. top_rated_items table
-- ============================================================================

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

-- Trigger for updated_at
create trigger trg_top_rated_items_updated_at
  before update on public.top_rated_items
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- 3. facility_subscriptions table
-- ============================================================================

CREATE TABLE public.facility_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The facility being enrolled
    facility_id UUID NOT NULL REFERENCES public.facility_profile(id),
    
    -- The subscription tier
    subscription_id UUID NOT NULL REFERENCES public.marketing_subscriptions(id),
    
    -- Enrollment status
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment'))
        DEFAULT 'pending_payment',
    
    -- Period tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ, -- nullable for indefinite/Lifetime tiers
    
    -- Snapshot of billing cycle at enrollment time
    billing_cycle TEXT NOT NULL,
    
    -- Auto-renewal flag
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Cancellation tracking
    cancelled_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: a facility can only have one active subscription at a time
CREATE UNIQUE INDEX facility_subscriptions_active_unique 
    ON public.facility_subscriptions (facility_id) 
    WHERE status = 'active';

-- Index for looking up subscriptions by facility
CREATE INDEX facility_subscriptions_facility_idx 
    ON public.facility_subscriptions (facility_id);

-- Index for expiring subscriptions (used by cron job)
CREATE INDEX facility_subscriptions_expiry_idx 
    ON public.facility_subscriptions (current_period_end) 
    WHERE status = 'active' AND auto_renew = FALSE;

-- Enable RLS
ALTER TABLE public.facility_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated users (to check their own subscription status)
CREATE POLICY "facility_subscriptions_select"
    ON public.facility_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        facility_id IN (
            SELECT fp.id FROM public.facility_profile fp 
            WHERE fp.owner_id = public.request_user_id()
        )
        OR public.is_app_admin()
    );

-- Admin-only writes
CREATE POLICY "facility_subscriptions_insert"
    ON public.facility_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_app_admin());

CREATE POLICY "facility_subscriptions_update"
    ON public.facility_subscriptions
    FOR UPDATE
    TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

-- Trigger for updated_at
CREATE TRIGGER trg_facility_subscriptions_updated_at
    BEFORE UPDATE ON public.facility_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. facility_has_privilege function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.facility_has_privilege(
    p_facility_id UUID,
    p_privilege TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.facility_subscriptions fs
        JOIN public.marketing_subscriptions ms ON fs.subscription_id = ms.id
        WHERE fs.facility_id = p_facility_id
          AND fs.status = 'active'
          AND (fs.current_period_end IS NULL OR fs.current_period_end > NOW())
          AND p_privilege = ANY (ms.privileges)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.facility_has_privilege(UUID, TEXT) TO anon, authenticated;

-- ============================================================================
-- 5. admin_upsert_top_rated_item RPC
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
security definer
set search_path = public
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

grant execute on function admin_upsert_top_rated_item to authenticated, service_role, anon;

-- Alias function admin_upsert_top_rated
create or replace function admin_upsert_top_rated(
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
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
    select * from admin_upsert_top_rated_item(
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
end;
$$;

grant execute on function admin_upsert_top_rated to authenticated, service_role, anon;

-- ============================================================================
-- 6. admin_remove_top_rated_item RPC
-- ============================================================================

create or replace function admin_remove_top_rated_item(
  p_module text,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  delete from public.top_rated_items
  where top_rated_items.module = p_module
    and top_rated_items.item_id = p_item_id;
end;
$$;

grant execute on function admin_remove_top_rated_item to authenticated, service_role, anon;

-- ============================================================================
-- 7. search_top_rated_items RPC
-- ============================================================================

create or replace function search_top_rated_items(
  p_table_name text,
  p_search_term text default null,
  p_page int default 1,
  p_limit int default 10
)
returns table (
  id uuid,
  title text,
  subtitle text,
  image_url text,
  rating_average numeric,
  rating_count int
)
language plpgsql
as $$
begin
  if p_table_name = 'facility' then
    return query
      select 
        fp.id,
        fp.facility_name as title,
        fp.area as subtitle,
        fp.featured_image_url as image_url,
        coalesce(fp.avg_rating, 0)::numeric as rating_average,
        0::int as rating_count
      from facility_profile fp
      where (fp.status is null or lower(fp.status::text) in ('active', 'approved', 'pending'))
        and (p_search_term is null or p_search_term = '' or 
             fp.facility_name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  elsif p_table_name = 'fitness_plan' then
    return query
      select 
        fp.id,
        fp.title,
        fp.description as subtitle,
        null::text as image_url,
        coalesce(fp.average_rating, 0)::numeric as rating_average,
        coalesce(fp.rating_count, 0)::int as rating_count
      from fitness_plans fp
      where (p_search_term is null or p_search_term = '' or 
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  elsif p_table_name = 'outdoor_route' then
    return query
      select 
        fp.id,
        fp.name as title,
        fp.area as subtitle,
        (case when array_length(fp.image_urls, 1) > 0 then fp.image_urls[1] else null end) as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_routes fp
      where (fp.is_active = true or fp.is_active is null)
        and (p_search_term is null or p_search_term = '' or 
             fp.name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%' or
             fp.category ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  elsif p_table_name = 'outdoor_event' then
    return query
      select 
        fp.id,
        fp.title,
        fp.area as subtitle,
        null::text as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_events fp
      where (p_search_term is null or p_search_term = '' or 
             fp.title ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  elsif p_table_name = 'challenge' then
    return query
      select 
        fp.id,
        fp.title,
        fp.description as subtitle,
        null::text as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_challenges fp
      where (p_search_term is null or p_search_term = '' or 
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  elsif p_table_name = 'exercise' then
    return query
      select 
        fp.id,
        fp.exercise_name as title,
        fp.primary_muscle_group as subtitle,
        fp.thumbnail_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_exercises fp
      where (p_search_term is null or p_search_term = '' or 
             fp.exercise_name ilike '%' || p_search_term || '%' or
             fp.primary_muscle_group ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  else
    -- Unrecognized table name simply returns zero rows
    return;
  end if;
end;
$$;

grant execute on function search_top_rated_items to authenticated;
grant execute on function search_top_rated_items to service_role;
grant execute on function search_top_rated_items to anon;