-- Keep a spatially-indexed map anchor for every outdoor route. The existing
-- start_lat/start_lng fields remain untouched for old clients and APIs.

alter table public.fitness_outdoor_routes
  add column if not exists start_anchor extensions.geography(Point, 4326);

create index if not exists idx_outdoor_routes_start_anchor_gist
  on public.fitness_outdoor_routes using gist (start_anchor)
  where start_anchor is not null;

create or replace function public.sync_outdoor_route_start_point()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_first jsonb;
  v_lat double precision;
  v_lng double precision;
begin
  new.start_lat := null;
  new.start_lng := null;
  new.start_anchor := null;

  if new.gps_data is not null
     and jsonb_typeof(new.gps_data -> 'points') = 'array'
     and coalesce(jsonb_array_length(new.gps_data -> 'points'), 0) > 0 then
    v_first := new.gps_data -> 'points' -> 0;
    v_lat := nullif(v_first ->> 0, '')::double precision;
    v_lng := nullif(v_first ->> 1, '')::double precision;

    if v_lat between -90 and 90 and v_lng between -180 and 180 then
      new.start_lat := v_lat;
      new.start_lng := v_lng;
      new.start_anchor := extensions.st_setsrid(
        extensions.st_makepoint(v_lng, v_lat),
        4326
      )::extensions.geography;
    end if;
  end if;

  return new;
end;
$$;

-- Existing GPS uploads were previously denormalized only into decimal columns.
-- Backfill the additive spatial anchor without rewriting the source GPS JSON.
-- This route-only metadata update must not refresh the unrelated top-rated
-- snapshot. Its trigger is restored before this migration completes.
alter table public.fitness_outdoor_routes
  disable trigger trg_fitness_outdoor_routes_top_rated_snapshot;

update public.fitness_outdoor_routes
set start_anchor = extensions.st_setsrid(
  extensions.st_makepoint(start_lng, start_lat),
  4326
)::extensions.geography
where start_anchor is null
  and start_lat between -90 and 90
  and start_lng between -180 and 180;

alter table public.fitness_outdoor_routes
  enable trigger trg_fitness_outdoor_routes_top_rated_snapshot;

-- The public map keeps its existing response shape. It now reads the spatial
-- anchor first, retaining the bounds-centre fallback for legacy incomplete rows.
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
set search_path = public, extensions
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
      extensions.st_y(r.start_anchor::extensions.geometry),
      case when jsonb_typeof(r.gps_data -> 'bounds') = 'object'
        then (((r.gps_data -> 'bounds' ->> 'minLat')::double precision
             + (r.gps_data -> 'bounds' ->> 'maxLat')::double precision) / 2)
      end
    ),
    coalesce(
      extensions.st_x(r.start_anchor::extensions.geometry),
      case when jsonb_typeof(r.gps_data -> 'bounds') = 'object'
        then (((r.gps_data -> 'bounds' ->> 'minLon')::double precision
             + (r.gps_data -> 'bounds' ->> 'maxLon')::double precision) / 2)
      end
    ),
    case
      when r.start_anchor is not null then 'start_point'
      when jsonb_typeof(r.gps_data -> 'bounds') = 'object' then 'bounds_center'
      else 'none'
    end,
    r.gps_data is not null
  from public.fitness_outdoor_routes r
  where r.is_active = true
    and r.verification_status = 'approved'
    and (
      r.start_anchor is not null
      or jsonb_typeof(r.gps_data -> 'bounds') = 'object'
    );
$$;

revoke all on function public.get_outdoor_route_pins() from public;
grant execute on function public.get_outdoor_route_pins() to anon, authenticated;

comment on column public.fitness_outdoor_routes.start_anchor is
  'GPS route start stored as geography(Point, 4326), maintained from gps_data and indexed for map queries.';

notify pgrst, 'reload schema';
