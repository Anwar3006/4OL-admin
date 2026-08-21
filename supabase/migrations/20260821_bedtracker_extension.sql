-- =============================================================================
-- BedTracker (PKM) management extension (Gap Analysis Part L).
--
-- Decisions: L-D1 (per-ward rows table, 8 ward types), L-D2 (fleet statuses),
-- L-D3 (deterministic haversine routing, no ML), L-D4 (tablet is out of
-- scope — admin only tracks tablet_online/last_ping_at), L-D7 (hardware and
-- subscription fields are metadata only — no billing integration).
-- Additive and re-runnable; all access stays behind service-role server
-- routes guarded by bedtracker.view / bedtracker.manage.
-- =============================================================================

-- 1. Per-ward registry (L-D1) ---------------------------------------------------
create table if not exists public.bed_tracker_wards (
  id uuid primary key default gen_random_uuid(),
  bed_tracker_facility_id uuid not null
    references public.bed_tracker_facilities (id) on delete cascade,
  ward_type text not null check (ward_type in
    ('general', 'icu', 'surgical', 'medical', 'maternity',
     'pediatric', 'psychiatric', 'geriatric')),
  total_beds integer not null default 0 check (total_beds >= 0),
  occupied_beds integer not null default 0 check (occupied_beds >= 0),
  available_beds integer not null default 0 check (available_beds >= 0),
  last_updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles (user_id),
  update_source text not null default 'admin'
    check (update_source in ('tablet', 'admin', 'api')),
  created_at timestamptz not null default now(),
  unique (bed_tracker_facility_id, ward_type)
);

create index if not exists idx_bt_wards_facility
  on public.bed_tracker_wards (bed_tracker_facility_id);
create index if not exists idx_bt_wards_type
  on public.bed_tracker_wards (ward_type);

-- Backfill wards from the 4 flat column sets on bed_tracker_facilities.
-- Only runs while the wards table is empty (re-runnable, never overwrites
-- live ward data).
insert into public.bed_tracker_wards
  (bed_tracker_facility_id, ward_type, total_beds, occupied_beds,
   available_beds, updated_by, update_source)
select f.id, v.ward_type, v.total, greatest(v.total - v.avail, 0), v.avail,
       f.updated_by, 'admin'
from public.bed_tracker_facilities f
cross join lateral (values
  ('general',    coalesce(f.general_ward_beds, 0), coalesce(f.general_ward_available, 0)),
  ('icu',        coalesce(f.icu_beds, 0),          coalesce(f.icu_available, 0)),
  ('maternity',  coalesce(f.maternity_beds, 0),    coalesce(f.maternity_available, 0)),
  ('pediatric',  coalesce(f.pediatric_beds, 0),    coalesce(f.pediatric_available, 0))
) as v(ward_type, total, avail)
where v.total > 0
  and not exists (select 1 from public.bed_tracker_wards w);

-- Keep available_beds consistent (L1 registry integrity).
create or replace function public.sync_bed_tracker_ward_available()
returns trigger
language plpgsql
as $$
begin
  new.available_beds := greatest(new.total_beds - new.occupied_beds, 0);
  new.last_updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_bt_wards_sync on public.bed_tracker_wards;
create trigger trg_bt_wards_sync
  before insert or update of total_beds, occupied_beds
  on public.bed_tracker_wards
  for each row execute function public.sync_bed_tracker_ward_available();

-- 2. Ward update audit trail (L6) -----------------------------------------------
create table if not exists public.bed_tracker_ward_updates (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.bed_tracker_wards (id) on delete cascade,
  previous_total integer,
  previous_occupied integer,
  new_total integer,
  new_occupied integer,
  actor uuid references public.user_profiles (user_id),
  source text not null default 'admin'
    check (source in ('tablet', 'admin', 'api')),
  created_at timestamptz not null default now()
);

create index if not exists idx_bt_ward_updates_ward
  on public.bed_tracker_ward_updates (ward_id, created_at desc);

-- 3. Ambulance fleet (L-D2) -------------------------------------------------------
create table if not exists public.ambulances (
  id uuid primary key default gen_random_uuid(),
  ambulance_code text not null unique,          -- AMB-xxxx
  service_provider text not null default 'NAS Ghana',
  region text,
  driver_user_id uuid references public.user_profiles (user_id),
  status text not null default 'standby'
    check (status in ('available', 'en_route', 'responding', 'standby')),
  current_gps text,                              -- "lat,lng"
  last_ping_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Facility registration metadata (L5) -------------------------------------------
alter table public.bed_tracker_facilities
  add column if not exists ghs_facility_code text,
  add column if not exists gps_coordinates text,        -- "lat,lng"
  add column if not exists facility_admin_name text,
  add column if not exists facility_admin_phone text,
  add column if not exists hardware_option text
    check (hardware_option in ('lease', 'purchase', 'byo')),
  add column if not exists subscription_tier text
    check (subscription_tier in ('starter', 'growth', 'enterprise')),
  add column if not exists tablet_online boolean not null default false,
  add column if not exists last_ping_at timestamptz;

-- 5. Dispatch linkage + modal fields (L4/L7) ----------------------------------------
alter table public.ambulance_dispatches
  add column if not exists ambulance_id uuid references public.ambulances (id),
  add column if not exists patient_gender text
    check (patient_gender in ('female', 'male', 'other')),
  add column if not exists patient_age_group text,
  add column if not exists required_ward text,
  add column if not exists rerouted_from_facility_id uuid
    references public.facility_profile (id),
  add column if not exists ai_routing_used boolean not null default false;

create index if not exists idx_ambulance_dispatches_ambulance
  on public.ambulance_dispatches (ambulance_id);

-- 6. Deterministic "AI" routing suggestion (L-D3) ------------------------------------
-- Top-3 nearest tracked facilities that have capacity for the requested ward
-- type, ordered by haversine distance from the pickup GPS. No ML — the "AI"
-- label is mockup language only.
create or replace function public.get_bedtracker_route_suggestions(
  p_pickup_gps text,
  p_ward_type text,
  p_limit integer default 3
)
returns table (
  facility_id uuid,
  bed_tracker_facility_id uuid,
  facility_name text,
  region text,
  gps_coordinates text,
  available_beds integer,
  distance_km numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pickup_lat double precision;
  v_pickup_lng double precision;
begin
  begin
    v_pickup_lat := split_part(p_pickup_gps, ',', 1)::double precision;
    v_pickup_lng := split_part(p_pickup_gps, ',', 2)::double precision;
  exception when others then
    raise exception 'Invalid pickup GPS — expected "lat,lng"';
  end;

  return query
  select
    f.id as facility_id,
    bf.id as bed_tracker_facility_id,
    f.facility_name,
    f.region,
    bf.gps_coordinates,
    w.available_beds,
    round(cast(
      6371 * 2 * asin(sqrt(
        power(sin(radians((split_part(bf.gps_coordinates, ',', 1)::double precision - v_pickup_lat) / 2)), 2) +
        cos(radians(v_pickup_lat)) *
        cos(radians(split_part(bf.gps_coordinates, ',', 1)::double precision)) *
        power(sin(radians((split_part(bf.gps_coordinates, ',', 2)::double precision - v_pickup_lng) / 2)), 2)
      )) as numeric), 1) as distance_km
  from public.bed_tracker_wards w
  join public.bed_tracker_facilities bf on bf.id = w.bed_tracker_facility_id
  join public.facility_profile f on f.id = bf.facility_id
  where w.ward_type = p_ward_type
    and w.available_beds > 0
    and bf.is_tracking_enabled
    and bf.gps_coordinates is not null
    and bf.gps_coordinates like '%,%'
  order by distance_km asc
  limit greatest(p_limit, 1);
end;
$$;

-- 7. RLS: service-role-only surfaces -------------------------------------------------
alter table public.bed_tracker_wards enable row level security;
alter table public.bed_tracker_ward_updates enable row level security;
alter table public.ambulances enable row level security;
-- No policies: service-role server routes only (bedtracker.view/manage).

revoke all on function public.get_bedtracker_route_suggestions(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.get_bedtracker_route_suggestions(text, text, integer)
  to service_role;
