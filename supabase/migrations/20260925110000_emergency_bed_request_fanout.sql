-- Emergency bed requests: an ambulance asks up to three eligible care
-- facilities at once. The response window is enforced by the database so an
-- ambulance cannot be stranded if its app is backgrounded or disconnected.

insert into public.provider_permissions (key, resource, action, description) values
  ('emergency.dispatch', 'emergency', 'dispatch', 'Create, cancel and choose emergency bed requests'),
  ('emergency.respond', 'emergency', 'respond', 'Answer an emergency bed request for a facility')
on conflict (key) do nothing;

insert into public.provider_role_permissions (role, permission_key) values
  ('owner', 'emergency.dispatch'),
  ('admin', 'emergency.dispatch'),
  ('department_manager', 'emergency.dispatch'),
  ('staff', 'emergency.dispatch'),
  ('owner', 'emergency.respond'),
  ('admin', 'emergency.respond'),
  ('department_manager', 'emergency.respond'),
  ('staff', 'emergency.respond')
on conflict do nothing;

-- Facilities opt into emergency bed alerts explicitly. Ringing can be muted,
-- but the alert itself remains high priority and carries the OS vibration
-- pattern. Notification permissions and platform Focus/DND policy still take
-- precedence outside the foreground app.
alter table public.providers
  add column if not exists emergency_bed_alerts_enabled boolean not null default false,
  add column if not exists emergency_alert_sound_enabled boolean not null default true;

create table public.emergency_bed_requests (
  id uuid primary key default gen_random_uuid(),
  request_reference text not null unique default ('BED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  operator_provider_id uuid not null references public.providers(id) on delete restrict,
  dispatch_id uuid references public.ambulance_dispatches(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  pickup_location extensions.geometry(Point, 4326) not null,
  pickup_address text not null,
  required_ward text not null default 'general',
  patient_summary text,
  priority text not null default 'critical' check (priority in ('critical', 'urgent')),
  status text not null default 'searching'
    check (status in ('searching', 'selection_required', 'assigned', 'exhausted', 'cancelled')),
  fanout_round integer not null default 0,
  response_due_at timestamptz,
  selected_facility_provider_id uuid references public.providers(id) on delete set null,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergency_bed_request_facilities (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_bed_requests(id) on delete cascade,
  facility_provider_id uuid not null references public.providers(id) on delete restrict,
  fanout_round integer not null,
  state text not null default 'pending'
    check (state in ('pending', 'available', 'unavailable', 'timed_out', 'selected', 'superseded')),
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  response_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, facility_provider_id)
);

create index emergency_bed_requests_operator_active_idx
  on public.emergency_bed_requests (operator_provider_id, created_at desc)
  where status in ('searching', 'selection_required');

create index emergency_bed_requests_timeout_idx
  on public.emergency_bed_requests (response_due_at)
  where status = 'searching';

create index emergency_bed_request_facilities_facility_pending_idx
  on public.emergency_bed_request_facilities (facility_provider_id, created_at desc)
  where state = 'pending';

alter table public.emergency_bed_requests enable row level security;
alter table public.emergency_bed_request_facilities enable row level security;

-- These tables are only accessed through the narrow RPCs below. A facility
-- cannot browse another facility's incoming emergencies or forge a response.
revoke all on public.emergency_bed_requests from anon, authenticated;
revoke all on public.emergency_bed_request_facilities from anon, authenticated;

create or replace function public.fn_emergency_bed_fanout(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_request public.emergency_bed_requests%rowtype;
  v_round integer;
  v_target_count integer := 0;
  v_recipients jsonb;
begin
  select * into v_request
  from public.emergency_bed_requests
  where id = p_request_id
  for update;

  if not found or v_request.status not in ('searching', 'selection_required') then
    return 0;
  end if;

  if exists (
    select 1 from public.emergency_bed_request_facilities f
    where f.request_id = p_request_id and f.state = 'pending'
  ) then
    return 0;
  end if;

  v_round := v_request.fanout_round + 1;

  with candidates as (
    select p.id
    from public.providers p
    where p.kind = 'care_facility'
      and p.status = 'active'
      and p.location is not null
      and p.emergency_bed_alerts_enabled
      and not exists (
        select 1 from public.emergency_bed_request_facilities already
        where already.request_id = p_request_id
          and already.facility_provider_id = p.id
      )
    -- `location` has the existing GiST index. KNN ordering gives us the
    -- nearest three candidates without casting away that index.
    order by p.location <-> v_request.pickup_location
    limit 3
  ), inserted as (
    insert into public.emergency_bed_request_facilities
      (request_id, facility_provider_id, fanout_round)
    select p_request_id, id, v_round from candidates
    returning facility_provider_id
  )
  select count(*) into v_target_count from inserted;

  if v_target_count = 0 then
    update public.emergency_bed_requests
       set status = 'exhausted', response_due_at = null, updated_at = now()
     where id = p_request_id;
    return 0;
  end if;

  update public.emergency_bed_requests
     set status = 'searching',
         fanout_round = v_round,
         response_due_at = now() + interval '60 seconds',
         updated_at = now()
   where id = p_request_id;

  -- Send the urgent push to every active facility member, not only the
  -- legal owner. The data route opens a full-screen in-app alert on receipt.
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', recipient.user_id,
    'title', 'Emergency bed request',
    'body', 'Respond within 60 seconds: ' || v_request.required_ward || ' bed needed.',
    'type', 'system',
    'channel_id', 'emergency-bed-alerts',
    'metadata', jsonb_build_object(
      'route', '/emergency-bed-alert/' || p_request_id::text,
      'emergency_bed_request_id', p_request_id,
      'priority', v_request.priority
    )
  )), '[]'::jsonb)
  into v_recipients
  from (
    select distinct p.owner_id as user_id
    from public.providers p
    join public.emergency_bed_request_facilities f
      on f.facility_provider_id = p.id
    where f.request_id = p_request_id
      and f.fanout_round = v_round
    union
    select distinct m.user_id
    from public.provider_members m
    join public.emergency_bed_request_facilities f
      on f.facility_provider_id = m.provider_id
    where f.request_id = p_request_id
      and f.fanout_round = v_round
      and m.status = 'active'
  ) recipient;

  if jsonb_array_length(v_recipients) > 0 then
    perform public.dispatch_notification(v_recipients, null, 'business');
  end if;

  return v_target_count;
end;
$function$;

create or replace function public.fn_advance_emergency_bed_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_status text;
begin
  select status into v_status from public.emergency_bed_requests where id = p_request_id for update;
  if v_status is null or v_status not in ('searching', 'selection_required') then return; end if;

  if exists (
    select 1 from public.emergency_bed_request_facilities
    where request_id = p_request_id and state = 'available'
  ) then
    update public.emergency_bed_requests
       set status = 'selection_required', response_due_at = null, updated_at = now()
     where id = p_request_id;
    return;
  end if;

  if exists (
    select 1 from public.emergency_bed_request_facilities
    where request_id = p_request_id and state = 'pending'
  ) then return; end if;

  perform public.fn_emergency_bed_fanout(p_request_id);
end;
$function$;

create or replace function public.create_emergency_bed_request(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_pickup_address text,
  p_required_ward text default 'general',
  p_patient_summary text default null,
  p_priority text default 'critical'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_operator_provider_id uuid;
  v_dispatch_id uuid;
  v_request_id uuid;
  v_reference text;
begin
  if (select auth.uid()) is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_pickup_lat is null or p_pickup_lng is null or p_pickup_lat not between -90 and 90 or p_pickup_lng not between -180 and 180 then
    raise exception 'A valid pickup location is required' using errcode = '22023';
  end if;
  if coalesce(trim(p_pickup_address), '') = '' then raise exception 'A pickup address is required' using errcode = '22023'; end if;
  if p_priority not in ('critical', 'urgent') then raise exception 'Invalid priority' using errcode = '22023'; end if;

  select p.id into v_operator_provider_id
  from public.providers p
  where p.kind = 'ambulance_operator'
    and p.status = 'active'
    and public.is_provider_member(p.id, 'emergency.dispatch')
  order by p.created_at
  limit 1;

  if v_operator_provider_id is null then
    raise exception 'You do not have dispatch access for an active ambulance provider' using errcode = '42501';
  end if;

  v_reference := 'AMB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.ambulance_dispatches
    (dispatch_reference, emergency_type, pickup_address, pickup_gps, dispatcher_id, required_ward, priority, status)
  values
    (v_reference, 'bed_request', trim(p_pickup_address), p_pickup_lat::text || ',' || p_pickup_lng::text,
     (select auth.uid()), coalesce(nullif(trim(p_required_ward), ''), 'general'), p_priority, 'finding_bed')
  returning id into v_dispatch_id;

  insert into public.emergency_bed_requests
    (operator_provider_id, dispatch_id, requested_by, pickup_location, pickup_address, required_ward, patient_summary, priority)
  values
    (v_operator_provider_id, v_dispatch_id, (select auth.uid()),
     st_setsrid(st_makepoint(p_pickup_lng, p_pickup_lat), 4326), trim(p_pickup_address),
     coalesce(nullif(trim(p_required_ward), ''), 'general'), nullif(trim(p_patient_summary), ''), p_priority)
  returning id into v_request_id;

  perform public.fn_emergency_bed_fanout(v_request_id);

  return jsonb_build_object('request_id', v_request_id, 'dispatch_id', v_dispatch_id);
end;
$function$;

create or replace function public.respond_to_emergency_bed_request(
  p_target_id uuid,
  p_response text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_target public.emergency_bed_request_facilities%rowtype;
  v_due_at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_response not in ('available', 'unavailable') then raise exception 'Invalid response' using errcode = '22023'; end if;

  select f.* into v_target
  from public.emergency_bed_request_facilities f
  where f.id = p_target_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select response_due_at into v_due_at
  from public.emergency_bed_requests
  where id = v_target.request_id;
  if not public.is_provider_member(v_target.facility_provider_id, 'emergency.respond') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_target.state <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_resolved'); end if;

  if v_due_at <= now() then
    update public.emergency_bed_request_facilities
       set state = 'timed_out', updated_at = now()
     where id = p_target_id;
    perform public.fn_advance_emergency_bed_request(v_target.request_id);
    return jsonb_build_object('ok', false, 'error', 'timed_out');
  end if;

  update public.emergency_bed_request_facilities
     set state = p_response,
         responded_by = (select auth.uid()),
         responded_at = now(),
         response_note = nullif(trim(p_note), ''),
         updated_at = now()
   where id = p_target_id;

  perform public.fn_advance_emergency_bed_request(v_target.request_id);
  return jsonb_build_object('ok', true, 'state', p_response);
end;
$function$;

create or replace function public.select_emergency_bed_destination(p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_target public.emergency_bed_request_facilities%rowtype;
  v_operator_provider_id uuid;
begin
  select f.* into v_target
  from public.emergency_bed_request_facilities f
  where f.id = p_target_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select operator_provider_id into v_operator_provider_id
  from public.emergency_bed_requests
  where id = v_target.request_id;
  if not public.is_provider_member(v_operator_provider_id, 'emergency.dispatch') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_target.state <> 'available' then return jsonb_build_object('ok', false, 'error', 'facility_not_available'); end if;

  update public.emergency_bed_request_facilities
     set state = case when id = p_target_id then 'selected' else 'superseded' end,
         updated_at = now()
   where request_id = v_target.request_id
     and state in ('pending', 'available');

  update public.emergency_bed_requests
     set status = 'assigned', selected_facility_provider_id = v_target.facility_provider_id,
         selected_at = now(), response_due_at = null, updated_at = now()
   where id = v_target.request_id;

  return jsonb_build_object('ok', true, 'request_id', v_target.request_id, 'facility_provider_id', v_target.facility_provider_id);
end;
$function$;

create or replace function public.get_my_emergency_bed_requests()
returns table(
  request_id uuid, request_reference text, pickup_address text, pickup_lat double precision,
  pickup_lng double precision, required_ward text, priority text, status text, response_due_at timestamptz,
  selected_facility_provider_id uuid, created_at timestamptz, facilities jsonb
)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
  select r.id, r.request_reference, r.pickup_address,
         st_y(r.pickup_location)::double precision, st_x(r.pickup_location)::double precision,
         r.required_ward, r.priority, r.status, r.response_due_at, r.selected_facility_provider_id, r.created_at,
         coalesce(jsonb_agg(jsonb_build_object(
           'target_id', f.id, 'provider_id', f.facility_provider_id, 'name', p.name,
           'latitude', p.latitude, 'longitude', p.longitude, 'state', f.state,
           'responded_at', f.responded_at, 'note', f.response_note
         ) order by f.created_at) filter (where f.id is not null), '[]'::jsonb)
  from public.emergency_bed_requests r
  left join public.emergency_bed_request_facilities f on f.request_id = r.id
  left join public.providers p on p.id = f.facility_provider_id
  where public.is_provider_member(r.operator_provider_id, 'emergency.dispatch')
  group by r.id
  order by r.created_at desc
  limit 50;
$function$;

create or replace function public.get_my_pending_emergency_bed_alerts()
returns table(
  target_id uuid, request_id uuid, request_reference text, pickup_address text,
  required_ward text, priority text, response_due_at timestamptz, patient_summary text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select f.id, r.id, r.request_reference, r.pickup_address, r.required_ward,
         r.priority, r.response_due_at, r.patient_summary
  from public.emergency_bed_request_facilities f
  join public.emergency_bed_requests r on r.id = f.request_id
  where f.state = 'pending'
    and r.status = 'searching'
    and r.response_due_at > now()
    and public.is_provider_member(f.facility_provider_id, 'emergency.respond')
  order by r.response_due_at;
$function$;

create or replace function public.process_expired_emergency_bed_requests()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request_id uuid;
  v_count integer := 0;
begin
  for v_request_id in
    select id from public.emergency_bed_requests
    where status = 'searching' and response_due_at <= now()
    for update skip locked
  loop
    update public.emergency_bed_request_facilities
       set state = 'timed_out', updated_at = now()
     where request_id = v_request_id and state = 'pending';
    perform public.fn_advance_emergency_bed_request(v_request_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;

revoke all on function public.fn_emergency_bed_fanout(uuid) from public, anon, authenticated;
revoke all on function public.fn_advance_emergency_bed_request(uuid) from public, anon, authenticated;
revoke all on function public.process_expired_emergency_bed_requests() from public, anon, authenticated;
revoke all on function public.create_emergency_bed_request(double precision, double precision, text, text, text, text) from public, anon;
revoke all on function public.respond_to_emergency_bed_request(uuid, text, text) from public, anon;
revoke all on function public.select_emergency_bed_destination(uuid) from public, anon;
revoke all on function public.get_my_emergency_bed_requests() from public, anon;
revoke all on function public.get_my_pending_emergency_bed_alerts() from public, anon;
grant execute on function public.create_emergency_bed_request(double precision, double precision, text, text, text, text) to authenticated;
grant execute on function public.respond_to_emergency_bed_request(uuid, text, text) to authenticated;
grant execute on function public.select_emergency_bed_destination(uuid) to authenticated;
grant execute on function public.get_my_emergency_bed_requests() to authenticated;
grant execute on function public.get_my_pending_emergency_bed_alerts() to authenticated;

drop trigger if exists trg_emergency_bed_requests_updated_at on public.emergency_bed_requests;
create trigger trg_emergency_bed_requests_updated_at
  before update on public.emergency_bed_requests
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_emergency_bed_request_facilities_updated_at on public.emergency_bed_request_facilities;
create trigger trg_emergency_bed_request_facilities_updated_at
  before update on public.emergency_bed_request_facilities
  for each row execute function public.update_updated_at_column();

select cron.unschedule(jobid)
from cron.job
where jobname = 'emergency-bed-request-timeouts';

select cron.schedule(
  'emergency-bed-request-timeouts',
  '* * * * *',
  'select public.process_expired_emergency_bed_requests();'
);

notify pgrst, 'reload schema';
