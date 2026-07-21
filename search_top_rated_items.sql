-- ============================================================================
-- RPC: search_top_rated_items
-- ============================================================================
-- Search for items to add to top_rated_items table
-- Parameters:
--   p_table_name: The module type (facility, fitness_plan, outdoor_route, etc.)
--   p_search_term: Optional search term to filter results
--   p_page: Page number for pagination (default 1)
--   p_limit: Items per page (default 10)
--
-- Schema confirmed from scripts/schema.sql:
--   fitness_outdoor_routes : no status col, uses is_active (bool) +
--       verification_status (moderation_status enum), image_urls (text[]),
--       start_location_name, category — NO area column
--   fitness_outdoor_events : no status col (has status::challenge_status), 
--       has area, description, title — no image
--   fitness_challenges     : status::challenge_status, featured_image_url — NO area
--   fitness_exercises      : status text ('published'/'draft'/'archived'),
--       is_active bool, thumbnail_url — NO area
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
security definer
set search_path = public
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
    
-- fitness_outdoor_routes: no status col; uses is_active (bool) + 
-- verification_status (moderation_status). image is image_urls text[].
-- Has area column.
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
    
  -- fitness_outdoor_events: has status::challenge_status, area, description, title.
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
             fp.area ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  -- fitness_challenges: status::challenge_status ('draft'/'upcoming'/etc),
  -- has featured_image_url — NO area column.
  elsif p_table_name = 'challenge' then
    return query
      select 
        fp.id,
        fp.title,
        fp.description as subtitle,
        fp.featured_image_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_challenges fp
      where (p_search_term is null or p_search_term = '' or 
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;
    
  -- fitness_exercises: status text ('published'/'draft'/'archived'),
  -- is_active bool, thumbnail_url.
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
      where fp.is_active = true
        and fp.status in ('published', 'draft')
        and (p_search_term is null or p_search_term = '' or 
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

-- Grant execute permissions
grant execute on function search_top_rated_items to authenticated;
grant execute on function search_top_rated_items to service_role;
grant execute on function search_top_rated_items to anon;