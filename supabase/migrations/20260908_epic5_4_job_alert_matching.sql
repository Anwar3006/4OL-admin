-- Epic 5.4: job-alert radius matching.
--
-- job_alerts had no coordinates and job_postings.distance_radius_km was a
-- dormant column nobody read — no matching engine existed at all. This adds
-- optional coordinates + radius to job_alerts, teaches upsert_job_alert to
-- read them from the same jsonb param it already takes (signature
-- unchanged, so old mobile builds that never send these keys are
-- unaffected — NULLs simply mean "no radius filter", identical to today's
-- region/specialty/job_type-only matching), and wires a trigger that fires
-- the moment a posting is approved (status -> 'published', the exact
-- transition features/jobs/api/review.ts performs) to notify matching
-- alerts via the shared dispatch_notification push primitive, with a dedup
-- ledger so a re-fired trigger can never double-notify.
--
-- Distance uses a plain haversine formula against facility_profile's real
-- latitude/longitude columns, not facility_profile.location — that geometry
-- column's SRID is 0 (verified live), i.e. unprojected and unreliable for
-- real-world distance. Haversine also matches this codebase's own
-- precedent (lib/utils.ts's haversineKm on the mobile side), rather than
-- introducing a first PostGIS geography usage.

alter table public.job_alerts
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists radius_km integer;

create or replace function public.upsert_job_alert(p_prefs jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;
  insert into public.job_alerts (
    user_id, is_active, regions, specialties, job_types,
    latitude, longitude, radius_km, updated_at
  )
  values (
    auth.uid(),
    coalesce((p_prefs ->> 'is_active')::boolean, true),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'regions', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'specialties', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'job_types', '[]'::jsonb)) x), '{}'),
    (p_prefs ->> 'latitude')::double precision,
    (p_prefs ->> 'longitude')::double precision,
    (p_prefs ->> 'radius_km')::integer,
    now()
  )
  on conflict (user_id) do update
    set is_active = excluded.is_active,
        regions = excluded.regions,
        specialties = excluded.specialties,
        job_types = excluded.job_types,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        radius_km = excluded.radius_km,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$function$;

create table if not exists public.job_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notified_at timestamptz not null default now(),
  unique (job_id, user_id)
);

alter table public.job_alert_notifications enable row level security;
-- Service-only: written by the trigger below, never read by a client.
revoke all on public.job_alert_notifications from anon, authenticated;

create or replace function public.notify_job_alert_matches()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_facility_lat double precision;
  v_facility_lng double precision;
  v_recipients jsonb;
begin
  select latitude, longitude into v_facility_lat, v_facility_lng
    from public.facility_profile
   where id = new.facility_id;

  with matches as (
    select ja.user_id
      from public.job_alerts ja
     where ja.is_active
       and (ja.regions = '{}' or new.region = any(ja.regions))
       and (ja.specialties = '{}' or new.specialty = any(ja.specialties))
       and (ja.job_types = '{}' or new.job_type = any(ja.job_types))
       and (
         ja.radius_km is null
         or ja.latitude is null or ja.longitude is null
         or v_facility_lat is null or v_facility_lng is null
         or (
           2 * 6371 * asin(sqrt(
             sin(radians(v_facility_lat - ja.latitude) / 2) ^ 2
             + cos(radians(ja.latitude)) * cos(radians(v_facility_lat))
               * sin(radians(v_facility_lng - ja.longitude) / 2) ^ 2
           ))
         ) <= ja.radius_km
       )
  ),
  newly_notified as (
    insert into public.job_alert_notifications (job_id, user_id)
    select new.id, m.user_id from matches m
    on conflict (job_id, user_id) do nothing
    returning user_id
  )
  select jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'title', 'New job matching your alert',
      'body', new.title,
      'type', 'job_alert_match',
      'metadata', jsonb_build_object('job_id', new.id),
      'channel_id', 'jobs-alerts'
    )
  )
  into v_recipients
  from newly_notified;

  if v_recipients is not null then
    -- Explicit 2-arg call: dispatch_notification is overloaded
    -- (1-arg legacy vs. 2-arg with delivery-receipt logging), and a bare
    -- 1-arg call from PL/pgSQL risks resolving ambiguously between them.
    perform public.dispatch_notification(v_recipients, null::uuid);
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_notify_job_alert_matches on public.job_postings;
create trigger trg_notify_job_alert_matches
  after update of status on public.job_postings
  for each row
  when (new.status = 'published' and old.status is distinct from new.status)
  execute function public.notify_job_alert_matches();
