-- P0-13: search_providers(...) for the future mobile directory. Nothing
-- calls it yet (the Business/consumer directory screens don't exist —
-- P0-16/17). Public read: anon + authenticated, matching global_search's
-- reach. Computes the haversine distance once in a CTE and reuses it for
-- both the radius filter and the sort, rather than repeating the formula.
create or replace function public.search_providers(
  p_kind public.provider_kind default null,
  p_type text default null,
  p_capability text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km numeric default null,
  p_query text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  kind public.provider_kind,
  provider_type text,
  area text,
  region text,
  rating_average numeric,
  rating_count int,
  featured_image_url text,
  distance_km numeric,
  is_online_only boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with candidates as (
    select
      p.*,
      case
        when p_lat is not null and p_lng is not null
             and p.latitude is not null and p.longitude is not null
        then round(cast(
          6371 * 2 * asin(sqrt(
            power(sin(radians(p.latitude - p_lat) / 2), 2) +
            cos(radians(p_lat)) * cos(radians(p.latitude)) *
            power(sin(radians(p.longitude - p_lng) / 2), 2)
          )) as numeric), 1)
        else null
      end as computed_distance_km
    from public.providers p
    join public.provider_types pt on pt.key = p.provider_type
    where p.status = 'active'
      and pt.is_listed
      and (p_kind is null or p.kind = p_kind)
      and (p_type is null or p.provider_type = p_type)
      and (p_query is null or p_query = '' or p.name ilike '%' || p_query || '%')
      and (p_capability is null or exists (
        select 1 from public.provider_capabilities pc
        where pc.provider_id = p.id and pc.capability = p_capability
      ))
  )
  select
    c.id, c.name, c.kind, c.provider_type, c.area, c.region::text,
    c.rating_average, c.rating_count, c.featured_image_url,
    c.computed_distance_km as distance_km,
    c.is_online_only
  from candidates c
  where p_radius_km is null
     or c.is_online_only
     or (c.computed_distance_km is null and (p_lat is null or p_lng is null))
     or c.computed_distance_km <= p_radius_km
  order by
    coalesce(c.computed_distance_km, 999999) asc,
    c.rating_average desc nulls last,
    c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_providers(public.provider_kind, text, text, double precision, double precision, numeric, text, int, int) from public;
grant execute on function public.search_providers(public.provider_kind, text, text, double precision, double precision, numeric, text, int, int) to anon, authenticated, service_role;
