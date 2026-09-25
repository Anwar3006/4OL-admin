-- Restore the decimal-only route-anchor implementation used before
-- 20260925090000_outdoor_route_spatial_anchor.sql.

create or replace function public.sync_outdoor_route_start_point()
returns trigger
language plpgsql
as $$
declare
  v_first jsonb;
begin
  if new.gps_data is not null
     and jsonb_typeof(new.gps_data -> 'points') = 'array'
     and coalesce(jsonb_array_length(new.gps_data -> 'points'), 0) > 0 then
    v_first := new.gps_data -> 'points' -> 0;
    new.start_lat := nullif(v_first ->> 0, '')::double precision;
    new.start_lng := nullif(v_first ->> 1, '')::double precision;
  else
    new.start_lat := null;
    new.start_lng := null;
  end if;
  return new;
end;
$$;

create or replace function public.get_outdoor_route_pins()
returns table (
  id uuid,
  name text,
  category text,
  difficulty text,
  distance_km numeric,
  region text,
  area text,
  route_class text,
  rating numeric,
  start_lat double precision,
  start_lng double precision,
  pin_source text,
  has_gps boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.category,
    r.difficulty::text,
    r.distance_km,
    r.region,
    r.area,
    coalesce(r.route_class, 'community'),
    (
      select round(avg(rev.rating)::numeric, 1)
      from public.fitness_outdoor_reviews rev
      where rev.route_id = r.id
        and rev.moderation_status = 'approved'
    ),
    coalesce(
      r.start_lat,
      case when jsonb_typeof(r.gps_data -> 'bounds') = 'object'
        then (((r.gps_data -> 'bounds' ->> 'minLat')::double precision
             + (r.gps_data -> 'bounds' ->> 'maxLat')::double precision) / 2)
      end
    ),
    coalesce(
      r.start_lng,
      case when jsonb_typeof(r.gps_data -> 'bounds') = 'object'
        then (((r.gps_data -> 'bounds' ->> 'minLon')::double precision
             + (r.gps_data -> 'bounds' ->> 'maxLon')::double precision) / 2)
      end
    ),
    case
      when r.start_lat is not null then 'start_point'
      when jsonb_typeof(r.gps_data -> 'bounds') = 'object' then 'bounds_center'
      else 'none'
    end,
    r.gps_data is not null
  from public.fitness_outdoor_routes r
  where r.is_active = true
    and r.verification_status = 'approved'
    and (
      r.start_lat is not null
      or jsonb_typeof(r.gps_data -> 'bounds') = 'object'
    );
$$;

revoke all on function public.get_outdoor_route_pins() from public;
grant execute on function public.get_outdoor_route_pins() to anon, authenticated;

drop index if exists public.idx_outdoor_routes_start_anchor_gist;
alter table public.fitness_outdoor_routes
  drop column if exists start_anchor;

notify pgrst, 'reload schema';
