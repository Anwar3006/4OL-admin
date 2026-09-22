-- Rollback for 20260921170000_p013_fix_bedtracker_region_cast.sql
-- Restores the definition as it stood after p013_repoint_read_only_functions
-- (unqualified f.region). NOTE: that definition errors 42804 on every call, so
-- rolling back re-breaks the function; it exists only to satisfy "every
-- migration has a rollback".
create or replace function public.get_bedtracker_route_suggestions(p_pickup_gps text, p_ward_type text, p_limit integer DEFAULT 3)
 RETURNS TABLE(facility_id uuid, bed_tracker_facility_id uuid, facility_name text, region text, gps_coordinates text, available_beds integer, distance_km numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    f.name as facility_name,
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
  join public.providers f on f.id = bf.facility_id
  where w.ward_type = p_ward_type
    and w.available_beds > 0
    and bf.is_tracking_enabled
    and bf.gps_coordinates is not null
    and bf.gps_coordinates like '%,%'
    and f.status::text = 'active'
    and f.kind = 'care_facility'
  order by distance_km asc
  limit greatest(p_limit, 1);
end;
$function$;
