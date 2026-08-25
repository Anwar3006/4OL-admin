-- =============================================================================
-- Map & Footprint extension (Gap Analysis Part F).
--
-- Decisions adopted (doc recommendations):
--   F-D1  new collector_footprints table (FP-XXXXXX log source)
--   F-D2  coverage = districts with >=1 facility / districts in
--         ghana-locations.json (denominator applied server-side in
--         /api/map/coverage, which owns the JSON constant)
--   F-D3  add latitude/longitude to ibp (mirrors facility_profile)
--   F-D4  route pin anchor = first point of gps_data.points (start_lat/
--         start_lng denormalized via trigger so the pins RPC stays cheap)
--   F-D5  map.export key already seeded in 20260820_rbac_catalog_extension.sql
--   F-D6  footprint/collector surfaces gated on users.view (server routes +
--         client tab visibility); get_registrar_trails re-checks the caller
--
-- Route verification: verification_status stays on the existing
-- moderation_status enum (approved = published). The mockup's Official vs
-- Community distinction lives in the new route_class column.
--
-- Additive and re-runnable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Collectors: admin/registrar users assigned to a region for field work.
-- -----------------------------------------------------------------------------
create table if not exists public.map_collectors (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.user_profiles(user_id) on delete cascade,
  assigned_region text,
  gps_status text not null default 'inactive'
    check (gps_status in ('active', 'weak', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_map_collectors_region
  on public.map_collectors (assigned_region);

-- -----------------------------------------------------------------------------
-- 2. Footprint points: GPS log posted by collectors from the field app.
-- -----------------------------------------------------------------------------
create table if not exists public.collector_footprints (
  id bigint generated always as identity primary key,
  collector_id uuid not null references public.user_profiles(user_id) on delete cascade,
  facility_id uuid references public.facility_profile(id) on delete set null,
  region text,
  district text,
  area text,
  latitude double precision not null,
  longitude double precision not null,
  gps_accuracy numeric,
  activity text not null default 'survey'
    check (activity in ('registered', 'survey', 'documented')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_collector_footprints_collector
  on public.collector_footprints (collector_id, created_at desc);
create index if not exists idx_collector_footprints_region
  on public.collector_footprints (region);
create index if not exists idx_collector_footprints_created
  on public.collector_footprints (created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Priority regions flagged from the Coverage Report.
-- -----------------------------------------------------------------------------
create table if not exists public.map_priority_regions (
  region text primary key,
  prioritized_by uuid references public.user_profiles(user_id) on delete set null,
  prioritized_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. IBP geographic coordinates (F-D3).
-- -----------------------------------------------------------------------------
alter table public.ibp
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists idx_ibp_coords
  on public.ibp (latitude, longitude)
  where latitude is not null and longitude is not null;
create index if not exists idx_ibp_region on public.ibp (region);

-- -----------------------------------------------------------------------------
-- 5. Outdoor route start point denormalization + verification enrichment (F-D4).
--    gps_data.points is a [lat, lng] tuple array (lib/gpx.ts).
-- -----------------------------------------------------------------------------
alter table public.fitness_outdoor_routes
  add column if not exists start_lat double precision,
  add column if not exists start_lng double precision,
  add column if not exists route_class text check (route_class in ('official', 'community')),
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz;

create index if not exists idx_outdoor_routes_region
  on public.fitness_outdoor_routes (region);

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

drop trigger if exists trg_outdoor_route_start_point on public.fitness_outdoor_routes;
create trigger trg_outdoor_route_start_point
  before insert or update of gps_data on public.fitness_outdoor_routes
  for each row
  execute function public.sync_outdoor_route_start_point();

-- Backfill start points for rows already carrying a GPS track.
update public.fitness_outdoor_routes
set start_lat = nullif(gps_data -> 'points' -> 0 ->> 0, '')::double precision,
    start_lng = nullif(gps_data -> 'points' -> 0 ->> 1, '')::double precision
where start_lat is null
  and gps_data is not null
  and jsonb_typeof(gps_data -> 'points') = 'array'
  and coalesce(jsonb_array_length(gps_data -> 'points'), 0) > 0;

-- -----------------------------------------------------------------------------
-- 6. Event registrations (backs the Participants modal).
-- -----------------------------------------------------------------------------
create table if not exists public.fitness_outdoor_event_registrations (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.fitness_outdoor_events(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'attended', 'cancelled')),
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_registrations_event
  on public.fitness_outdoor_event_registrations (event_id);

-- -----------------------------------------------------------------------------
-- 7. FitCoins incentive formula (single-row config, m-route-incentives).
-- -----------------------------------------------------------------------------
create table if not exists public.fitness_outdoor_incentives (
  id boolean primary key default true check (id),
  base_fitcoins integer not null default 50,
  per_km_fitcoins integer not null default 10,
  verification_bonus integer not null default 25,
  event_bonus integer not null default 20,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(user_id) on delete set null
);

insert into public.fitness_outdoor_incentives (id)
values (true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 8. Outdoor route pins (F.4): active + published routes only, so the same
--    RPC can power the mobile app's public map layer.
-- -----------------------------------------------------------------------------
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
    -- Anchor: start point of the GPS track, fallback = bounds center (F-D4).
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

-- -----------------------------------------------------------------------------
-- 9. Registrar/collector trails (replaces the untracked production function).
--    Role re-check per F.5: staff location data is PII -- callers need
--    users.view (Epic 30 audit pattern). Trails are built from collector
--    footprint points, falling back to facility pins submitted by the same
--    user when no footprint log exists yet.
-- -----------------------------------------------------------------------------
-- Return type changes from the earlier definition; CREATE OR REPLACE cannot.
drop function if exists public.get_registrar_trails(integer);

create or replace function public.get_registrar_trails(days_back integer default 1)
returns table (registrar_id uuid, trail jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and not public.has_4ol_permission(auth.uid(), 'users.view') then
    raise exception 'Not authorized';
  end if;

  return query
  with footprint_points as (
    select
      cf.collector_id as user_id,
      jsonb_agg(
        jsonb_build_array(cf.longitude, cf.latitude) order by cf.created_at
      ) as coords
    from public.collector_footprints cf
    where cf.created_at >= now() - (coalesce(days_back, 1) || ' days')::interval
    group by cf.collector_id
    having count(*) >= 2
  ),
  facility_points as (
    select
      fp.submitted_by as user_id,
      jsonb_agg(
        jsonb_build_array(fp.longitude, fp.latitude) order by fp.created_at
      ) as coords
    from public.facility_profile fp
    where fp.submitted_by is not null
      and fp.created_at >= now() - (coalesce(days_back, 1) || ' days')::interval
    group by fp.submitted_by
    having count(*) >= 2
  )
  select
    u.user_id,
    jsonb_build_object('type', 'LineString', 'coordinates', u.coords)
  from (
    select user_id, coords from footprint_points
    union all
    select f.user_id, f.coords
    from facility_points f
    where not exists (select 1 from footprint_points fp where fp.user_id = f.user_id)
  ) u;
end;
$$;

revoke all on function public.get_registrar_trails(integer) from public;
grant execute on function public.get_registrar_trails(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. RLS: admin surfaces read/write through service-role server routes; the
--     collector field app posts its own points.
-- -----------------------------------------------------------------------------
alter table public.map_collectors enable row level security;
alter table public.collector_footprints enable row level security;
alter table public.map_priority_regions enable row level security;
alter table public.fitness_outdoor_event_registrations enable row level security;
alter table public.fitness_outdoor_incentives enable row level security;

drop policy if exists map_collectors_admin on public.map_collectors;
create policy map_collectors_admin on public.map_collectors
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists collector_footprints_admin on public.collector_footprints;
create policy collector_footprints_admin on public.collector_footprints
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists collector_footprints_own on public.collector_footprints;
create policy collector_footprints_own on public.collector_footprints
  for insert to authenticated
  with check (collector_id = (select auth.uid()));

drop policy if exists map_priority_regions_admin on public.map_priority_regions;
create policy map_priority_regions_admin on public.map_priority_regions
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists event_registrations_admin on public.fitness_outdoor_event_registrations;
create policy event_registrations_admin on public.fitness_outdoor_event_registrations
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists event_registrations_own on public.fitness_outdoor_event_registrations;
create policy event_registrations_own on public.fitness_outdoor_event_registrations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists outdoor_incentives_admin on public.fitness_outdoor_incentives;
create policy outdoor_incentives_admin on public.fitness_outdoor_incentives
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop trigger if exists trg_map_collectors_updated_at on public.map_collectors;
create trigger trg_map_collectors_updated_at
  before update on public.map_collectors
  for each row
  execute function public.update_updated_at_column();
