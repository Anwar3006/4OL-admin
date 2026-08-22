-- =============================================================================
-- Gap Analysis Part AG — Map hardening: get_facilities_map lockdown +
-- facility_profile RLS (decisions M-D1, M-D2, M-D4)
-- =============================================================================
-- Findings closed:
--   * get_facilities_map was NOT SECURITY DEFINER, had no explicit grants
--     (PUBLIC/anon callable), trusted the caller's p_status (passing null
--     enumerated Rejected/Pending facilities), and never escaped ilike
--     wildcards.
--   * No rate limiting existed anywhere on the map path (mobile bypasses the
--     admin API entirely — there is no middleware chokepoint), so a DB-level
--     per-user throttle inside the RPC is the only enforceable gate (M-D2).
--   * facility_profile had zero RLS policies in any migration (M-D4).
--
-- Stays disconnected per M-D5: collector footprints/GPS, coverage analytics,
-- IBP pins, non-active statuses for non-admins. Facility-review marker
-- badges remain deferred until facility_reviews RLS lands.
--
-- Re-runnable. Signature of get_facilities_map is unchanged; mobile and
-- admin callers keep working.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Private throttle ledger (M-D2). RLS on + no policies = nobody reads or
--    writes it directly; only the SECURITY DEFINER RPC below touches it.
-- -----------------------------------------------------------------------------
create table if not exists public.map_rpc_throttle (
  user_id uuid primary key,
  window_start timestamptz not null default now(),
  request_count int not null default 0
);

alter table public.map_rpc_throttle enable row level security;
-- deliberately no policies: direct access denied to every role.

-- -----------------------------------------------------------------------------
-- 2. get_facilities_map rewrite (M-D1 + M-D2)
-- -----------------------------------------------------------------------------
drop function if exists public.get_facilities_map cascade;

create or replace function public.get_facilities_map(
    minlng          float,
    minlat          float,
    maxlng          float,
    maxlat          float,
    zoom_level      int,
    p_facility_name text    default null,
    p_region        text    default null,
    p_district      text    default null,
    p_facility_type text    default null,
    p_status        text    default 'active',
    p_is_top_rated  boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    map_data    jsonb;
    fetch_limit int;
    v_uid       uuid := nullif(public.request_user_id(), '')::uuid;
    v_is_admin  boolean := auth.role() = 'service_role' or public.is_app_admin();
    v_status    text;
    v_name      text;
    v_area      float;
    v_row       public.map_rpc_throttle%rowtype;
begin
    -- Auth gate: anonymous callers get nothing.
    if v_uid is null and auth.role() <> 'service_role' then
      raise exception 'Not authenticated';
    end if;

    -- M-D2 per-user throttle: 40 requests / rolling minute (pan/zoom bursts
    -- included). Admins and service_role are exempt.
    if not v_is_admin and v_uid is not null then
      insert into public.map_rpc_throttle (user_id, window_start, request_count)
      values (v_uid, now(), 1)
      on conflict (user_id) do update
        set window_start = case
              when public.map_rpc_throttle.window_start <= now() - interval '60 seconds'
              then now() else public.map_rpc_throttle.window_start end,
            request_count = case
              when public.map_rpc_throttle.window_start <= now() - interval '60 seconds'
              then 1 else public.map_rpc_throttle.request_count + 1 end;

      select * into v_row from public.map_rpc_throttle where user_id = v_uid;
      if v_row.request_count > 40 then
        raise exception 'Map request rate limit exceeded — try again shortly';
      end if;
    end if;

    -- Envelope sanity cap: reject world-sized bounding boxes (Ghana fits in
    -- roughly 6.6 x 6.7 degrees; 100 sq-deg allows country-wide views while
    -- blocking full-globe scrapes at high fetch limits).
    v_area := greatest(maxlng - minlng, 0) * greatest(maxlat - minlat, 0);
    if v_area > 100 then
      raise exception 'Requested map envelope too large';
    end if;

    if zoom_level < 10 then
        fetch_limit := 1000;
    else
        fetch_limit := 5000;
    end if;

    -- M-D1 server-enforced status: non-admin callers ALWAYS see active only;
    -- the client-supplied value is no longer trusted.
    v_status := case when v_is_admin then coalesce(p_status, 'active') else 'active' end;

    -- Wildcard-safe name filter.
    v_name := case
      when p_facility_name is null then null
      else replace(replace(replace(trim(p_facility_name), '\', '\\'), '%', '\%'), '_', '\_')
    end;

    select jsonb_build_object(
        'type', 'FeatureCollection',
        'features', coalesce(jsonb_agg(features.feature), '[]'::jsonb)
    ) into map_data
    from (
        select jsonb_build_object(
            'type', 'Feature',
            'geometry', st_asgeojson(location)::jsonb,
            'properties', jsonb_build_object(
                'id',           id,
                'name',         facility_name,
                'type',         facility_type,
                'avgRating',    avg_rating,
                'status',       status,
                'region',       region,
                'district',     district
            )
        ) as feature
        from facility_profile
        where location && st_makeenvelope(minlng, minlat, maxlng, maxlat, 4326)
          and (v_name is null or facility_name ilike '%' || v_name || '%')
          and (p_region is null or region::text = p_region)
          and (p_district is null or district = p_district)
          and (p_facility_type is null or facility_type::text = p_facility_type)
          and status::text = v_status
          and (p_is_top_rated is null or is_top_rated = p_is_top_rated)
        limit fetch_limit
    ) features;

    return map_data;
end;
$$;

revoke all on function public.get_facilities_map(float, float, float, float, int, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.get_facilities_map(float, float, float, float, int, text, text, text, text, text, boolean) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. facility_profile RLS (M-D4).
--    SELECT: active/approved for everyone authenticated, full visibility for
--    app admins (admin panel reads this table from the browser with the
--    signed-in admin's session) and for the facility's own owner.
--    Writes: admins only — no code path inserts/updates facility_profile from
--    mobile clients directly (verified by audit).
--    NOTE: mobile reads of *active* facilities (Top Rated shelf join, detail
--    screens, map) keep working; pending/rejected rows become invisible to
--    non-admins, which is the intent.
-- -----------------------------------------------------------------------------
alter table public.facility_profile enable row level security;

drop policy if exists "facility_profile_select_active_or_admin" on public.facility_profile;
create policy "facility_profile_select_active_or_admin"
on public.facility_profile
for select
to authenticated
using (
  lower(status::text) in ('active', 'approved')
  or public.is_app_admin()
  or owner_id = auth.uid()
);

drop policy if exists "facility_profile_insert_admin" on public.facility_profile;
create policy "facility_profile_insert_admin"
on public.facility_profile
for insert
to authenticated
with check (public.is_app_admin() or owner_id = auth.uid());

drop policy if exists "facility_profile_update_admin_or_owner" on public.facility_profile;
create policy "facility_profile_update_admin_or_owner"
on public.facility_profile
for update
to authenticated
using (public.is_app_admin() or owner_id = auth.uid())
with check (public.is_app_admin() or owner_id = auth.uid());

drop policy if exists "facility_profile_delete_admin" on public.facility_profile;
create policy "facility_profile_delete_admin"
on public.facility_profile
for delete
to authenticated
using (public.is_app_admin());

-- service_role bypasses RLS via bypassrls by default; nothing to grant.
