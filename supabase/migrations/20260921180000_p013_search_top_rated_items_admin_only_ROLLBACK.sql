-- ROLLBACK for 20260921180000_p013_search_top_rated_items_admin_only.sql
-- Restores the previous body (no admin gate). NOTE: rolling back re-opens the exposure:
-- any signed-in user can list pending providers' name / area / image through this RPC.
create or replace function public.search_top_rated_items(p_table_name text, p_search_term text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, subtitle text, image_url text, rating_average numeric, rating_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_table_name = 'facility' then
    return query
      select
        p.id,
        p.name as title,
        p.area as subtitle,
        p.featured_image_url as image_url,
        coalesce(p.avg_rating, 0)::numeric as rating_average,
        0::int as rating_count
      from public.providers p
      where p.kind in ('care_facility','vendor')
        and (p.status is null or lower(p.status::text) in ('active', 'approved', 'pending'))
        and (p_search_term is null or p_search_term = '' or
             p.name ilike '%' || p_search_term || '%' or
             p.area ilike '%' || p_search_term || '%')
      order by p.created_at desc
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
             fp.area ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

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
    return;
  end if;
end;
$function$;
