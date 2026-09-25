-- P2-01: Consumer booking engine.
--
-- Bookable catalogue items use the provider's existing business_hours as the
-- default availability. A provider can later add service-specific hours. All
-- consumer reads go through narrowly scoped SECURITY DEFINER functions; in
-- particular, credential document storage paths never become public.

alter table public.provider_catalogue_items
  add column if not exists is_bookable boolean not null default false,
  add column if not exists booking_modes text[] not null default array['clinic']::text[],
  add column if not exists booking_capacity integer not null default 1,
  add column if not exists booking_department_id uuid references public.provider_departments(id) on delete set null,
  add column if not exists booking_notes text;

alter table public.provider_catalogue_items
  drop constraint if exists provider_catalogue_items_bookable_item_type,
  drop constraint if exists provider_catalogue_items_booking_capacity_positive,
  drop constraint if exists provider_catalogue_items_booking_modes_valid;

alter table public.provider_catalogue_items
  add constraint provider_catalogue_items_bookable_item_type
    check (not is_bookable or item_type in ('service', 'package', 'session')),
  add constraint provider_catalogue_items_booking_capacity_positive
    check (booking_capacity > 0),
  add constraint provider_catalogue_items_booking_modes_valid
    check (booking_modes <@ array['clinic', 'video', 'home']::text[] and cardinality(booking_modes) > 0);

create index if not exists provider_catalogue_items_bookable_idx
  on public.provider_catalogue_items (provider_id, status, is_bookable)
  where is_bookable;

create table if not exists public.provider_booking_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  catalogue_item_id uuid references public.provider_catalogue_items(id) on delete cascade,
  department_id uuid references public.provider_departments(id) on delete set null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  mode text not null default 'clinic' check (mode in ('clinic', 'video', 'home')),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists provider_booking_availability_lookup_idx
  on public.provider_booking_availability (provider_id, catalogue_item_id, weekday)
  where active;

create table if not exists public.provider_booking_blocks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  department_id uuid references public.provider_departments(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists provider_booking_blocks_lookup_idx
  on public.provider_booking_blocks (provider_id, starts_at, ends_at);

create table if not exists public.provider_bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  catalogue_item_id uuid not null references public.provider_catalogue_items(id) on delete restrict,
  department_id uuid references public.provider_departments(id) on delete set null,
  patient_id uuid not null references auth.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode text not null check (mode in ('clinic', 'video', 'home')),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  patient_note text,
  provider_note text,
  suggested_starts_at timestamptz,
  suggested_ends_at timestamptz,
  cancellation_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((suggested_starts_at is null) = (suggested_ends_at is null))
);

create index if not exists provider_bookings_patient_idx
  on public.provider_bookings (patient_id, starts_at desc);
create index if not exists provider_bookings_provider_slot_idx
  on public.provider_bookings (provider_id, catalogue_item_id, starts_at, ends_at)
  where status in ('requested', 'confirmed');

create table if not exists public.provider_booking_group_attendees (
  booking_id uuid not null references public.provider_bookings(id) on delete cascade,
  attendee_user_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  primary key (booking_id, attendee_user_id)
);

alter table public.provider_booking_availability enable row level security;
alter table public.provider_booking_blocks enable row level security;
alter table public.provider_bookings enable row level security;
alter table public.provider_booking_group_attendees enable row level security;

revoke all on public.provider_booking_availability from anon, authenticated;
revoke all on public.provider_booking_blocks from anon, authenticated;
revoke all on public.provider_bookings from anon, authenticated;
revoke all on public.provider_booking_group_attendees from anon, authenticated;
grant all on public.provider_booking_availability, public.provider_booking_blocks,
  public.provider_bookings, public.provider_booking_group_attendees to service_role;
grant select on public.provider_booking_availability, public.provider_booking_blocks,
  public.provider_bookings, public.provider_booking_group_attendees to authenticated;

create policy "provider booking availability member read" on public.provider_booking_availability
  for select to authenticated using (
    (select public.is_provider_member(provider_id, 'bookings.manage', department_id))
  );
create policy "provider booking blocks member read" on public.provider_booking_blocks
  for select to authenticated using (
    (select public.is_provider_member(provider_id, 'bookings.manage', department_id))
  );
create policy "bookings patient or provider member read" on public.provider_bookings
  for select to authenticated using (
    patient_id = (select auth.uid())
    or (select public.is_provider_member(provider_id, 'bookings.manage', department_id))
  );
create policy "booking attendees participant or provider member read" on public.provider_booking_group_attendees
  for select to authenticated using (
    attendee_user_id = (select auth.uid())
    or exists (
      select 1 from public.provider_bookings b
      where b.id = booking_id
        and public.is_provider_member(b.provider_id, 'bookings.manage', b.department_id)
    )
  );

create or replace function public.set_catalogue_booking_settings(
  p_id uuid,
  p_provider_id uuid,
  p_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_department_id uuid;
  v_modes text[];
  v_capacity integer;
begin
  if not public.is_provider_member(p_provider_id, 'catalogue.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select booking_department_id into v_department_id
  from public.provider_catalogue_items
  where id = p_id and provider_id = p_provider_id
  for update;
  if not found then raise exception 'Catalogue item not found'; end if;

  if p_settings ? 'booking_department_id' then
    v_department_id := nullif(p_settings->>'booking_department_id', '')::uuid;
  end if;
  if v_department_id is not null and not public.is_provider_member(p_provider_id, 'catalogue.manage', v_department_id) then
    raise exception 'Not authorized for this department' using errcode = '42501';
  end if;

  select coalesce(array_agg(value), array['clinic']::text[]) into v_modes
  from jsonb_array_elements_text(coalesce(p_settings->'booking_modes', '["clinic"]'::jsonb)) value;
  v_capacity := coalesce(nullif(p_settings->>'booking_capacity', '')::integer, 1);

  update public.provider_catalogue_items
  set is_bookable = coalesce((p_settings->>'is_bookable')::boolean, is_bookable),
      booking_modes = v_modes,
      booking_capacity = v_capacity,
      booking_department_id = v_department_id,
      booking_notes = case when p_settings ? 'booking_notes' then nullif(p_settings->>'booking_notes', '') else booking_notes end,
      updated_at = now()
  where id = p_id and provider_id = p_provider_id;
  return p_id;
end;
$$;

create or replace function public.upsert_provider_booking_availability(
  p_provider_id uuid,
  p_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_department_id uuid := nullif(p_patch->>'department_id', '')::uuid;
  v_catalogue_item_id uuid := nullif(p_patch->>'catalogue_item_id', '')::uuid;
begin
  if not public.is_provider_member(p_provider_id, 'bookings.manage', v_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_catalogue_item_id is not null and not exists (
    select 1 from public.provider_catalogue_items
    where id = v_catalogue_item_id and provider_id = p_provider_id and is_bookable
  ) then raise exception 'Bookable catalogue item not found'; end if;

  if p_id is null then
    insert into public.provider_booking_availability (
      provider_id, catalogue_item_id, department_id, weekday, starts_at,
      ends_at, mode, slot_interval_minutes, active
    ) values (
      p_provider_id, v_catalogue_item_id, v_department_id,
      (p_patch->>'weekday')::smallint, (p_patch->>'starts_at')::time,
      (p_patch->>'ends_at')::time, coalesce(p_patch->>'mode', 'clinic'),
      coalesce((p_patch->>'slot_interval_minutes')::integer, 30),
      coalesce((p_patch->>'active')::boolean, true)
    ) returning id into v_id;
  else
    update public.provider_booking_availability
    set catalogue_item_id = v_catalogue_item_id, department_id = v_department_id,
        weekday = (p_patch->>'weekday')::smallint,
        starts_at = (p_patch->>'starts_at')::time, ends_at = (p_patch->>'ends_at')::time,
        mode = coalesce(p_patch->>'mode', 'clinic'),
        slot_interval_minutes = coalesce((p_patch->>'slot_interval_minutes')::integer, 30),
        active = coalesce((p_patch->>'active')::boolean, true), updated_at = now()
    where id = p_id and provider_id = p_provider_id returning id into v_id;
    if v_id is null then raise exception 'Availability window not found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.get_public_provider_booking_profile(p_provider_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'provider_id', p.id,
    'provider_name', p.name,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ci.id, 'name', ci.name, 'description', ci.description,
        'duration_minutes', coalesce(ci.duration_minutes, 30),
        'price', ci.price, 'currency', ci.currency, 'booking_modes', ci.booking_modes
      ) order by ci.name)
      from public.provider_catalogue_items ci
      where ci.provider_id = p.id and ci.status = 'published' and ci.is_bookable
        and ci.item_type in ('service', 'package', 'session')
        and (ci.capability_required is null or exists (
          select 1 from public.provider_capabilities pc
          where pc.provider_id = p.id and pc.capability = ci.capability_required
            and (pc.expires_at is null or pc.expires_at > now())
        ))
    ), '[]'::jsonb)
  )
  from public.providers p where p.id = p_provider_id and p.status = 'active';
$$;

create or replace function public.get_public_provider_trust(p_provider_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'capabilities', coalesce((
      select jsonb_agg(pc.capability order by pc.capability)
      from public.provider_capabilities pc
      where pc.provider_id = p.id and (pc.expires_at is null or pc.expires_at > now())
    ), '[]'::jsonb),
    'credentials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'credential_type', c.credential_type, 'number', c.number,
        'issued_at', c.issued_at, 'expires_at', c.expires_at
      ) order by c.credential_type)
      from public.provider_credentials c
      where c.provider_id = p.id and c.status = 'verified'
        and (c.expires_at is null or c.expires_at >= current_date)
    ), '[]'::jsonb)
  )
  from public.providers p where p.id = p_provider_id and p.status = 'active';
$$;

create or replace function public.get_provider_booking_slots(
  p_provider_id uuid,
  p_catalogue_item_id uuid,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_duration integer;
  v_capacity integer;
  v_department_id uuid;
  v_open time;
  v_close time;
  v_interval integer := 30;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slots jsonb := '[]'::jsonb;
  v_business_hours jsonb;
  v_availability record;
begin
  if p_date < (now() at time zone 'Africa/Accra')::date then return v_slots; end if;
  select coalesce(ci.duration_minutes, 30), ci.booking_capacity, ci.booking_department_id,
         p.business_hours
    into v_duration, v_capacity, v_department_id, v_business_hours
  from public.provider_catalogue_items ci
  join public.providers p on p.id = ci.provider_id
  where ci.id = p_catalogue_item_id and ci.provider_id = p_provider_id
    and ci.status = 'published' and ci.is_bookable and p.status = 'active';
  if not found then return v_slots; end if;

  select * into v_availability
  from public.provider_booking_availability a
  where a.provider_id = p_provider_id and a.active
    and a.weekday = extract(dow from p_date)::smallint
    and (a.catalogue_item_id = p_catalogue_item_id or a.catalogue_item_id is null)
  order by (a.catalogue_item_id is not null) desc
  limit 1;

  if found then
    v_open := v_availability.starts_at; v_close := v_availability.ends_at;
    v_interval := v_availability.slot_interval_minutes;
  else
    select (h->>'open')::time, (h->>'close')::time into v_open, v_close
    from jsonb_array_elements(case when jsonb_typeof(v_business_hours) = 'array' then v_business_hours else '[]'::jsonb end) h
    where lower(trim(h->>'day')) = lower(to_char(p_date, 'FMDay'))
      and coalesce((h->>'is_open')::boolean, true)
    limit 1;
  end if;
  if v_open is null or v_close is null then return v_slots; end if;

  for v_slot_start in
    select (p_date + candidate.slot_time)::timestamp at time zone 'Africa/Accra'
    from generate_series(
      v_open,
      v_close - make_interval(mins => v_duration),
      make_interval(mins => v_interval)
    ) as candidate(slot_time)
  loop
    v_slot_end := v_slot_start + make_interval(mins => v_duration);
    if v_slot_start <= now() then continue; end if;
    if exists (select 1 from public.provider_booking_blocks x where x.provider_id = p_provider_id and x.starts_at < v_slot_end and x.ends_at > v_slot_start) then continue; end if;
    if (select count(*) from public.provider_bookings b where b.provider_id = p_provider_id and b.catalogue_item_id = p_catalogue_item_id and b.status in ('requested', 'confirmed') and b.starts_at < v_slot_end and b.ends_at > v_slot_start) >= v_capacity then continue; end if;
    v_slots := v_slots || jsonb_build_array(jsonb_build_object('starts_at', v_slot_start, 'ends_at', v_slot_end));
  end loop;
  return v_slots;
end;
$$;

create or replace function public.request_provider_booking(
  p_provider_id uuid,
  p_catalogue_item_id uuid,
  p_starts_at timestamptz,
  p_mode text,
  p_patient_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_patient_id uuid := auth.uid();
  v_booking_id uuid;
  v_duration integer;
  v_ends_at timestamptz;
  v_department_id uuid;
  v_service_name text;
  v_available boolean;
begin
  if v_patient_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text || p_catalogue_item_id::text || p_starts_at::text, 0));
  select coalesce(duration_minutes, 30), booking_department_id, name
    into v_duration, v_department_id, v_service_name
  from public.provider_catalogue_items
  where id = p_catalogue_item_id and provider_id = p_provider_id and status = 'published'
    and is_bookable and p_mode = any(booking_modes);
  if not found then raise exception 'This service cannot be booked'; end if;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  select exists (
    select 1 from jsonb_array_elements(public.get_provider_booking_slots(
      p_provider_id, p_catalogue_item_id, (p_starts_at at time zone 'Africa/Accra')::date
    )) as slot(value) where (slot.value->>'starts_at')::timestamptz = p_starts_at
  ) into v_available;
  if not v_available then raise exception 'That time is no longer available'; end if;

  insert into public.provider_bookings (
    provider_id, catalogue_item_id, department_id, patient_id, starts_at, ends_at, mode, patient_note
  ) values (
    p_provider_id, p_catalogue_item_id, v_department_id, v_patient_id, p_starts_at, v_ends_at, p_mode, nullif(trim(p_patient_note), '')
  ) returning id into v_booking_id;

  perform public.dispatch_provider_alert(
    p_provider_id, 'booking', v_booking_id, 'New booking request',
    'A consumer requested ' || v_service_name || '.',
    jsonb_build_object('booking_id', v_booking_id, 'starts_at', p_starts_at)
  );
  perform public.dispatch_notification(jsonb_build_array(jsonb_build_object(
    'user_id', v_patient_id, 'title', 'Booking request sent',
    'body', 'Your request for ' || v_service_name || ' is awaiting confirmation.',
    'type', 'booking', 'metadata', jsonb_build_object('booking_id', v_booking_id, 'deep_link', '/Reminders/Appointments')
  )), null, 'consumer');
  return v_booking_id;
end;
$$;

create or replace function public.decide_provider_booking(
  p_booking_id uuid,
  p_decision text,
  p_provider_note text default null,
  p_suggested_starts_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_booking public.provider_bookings%rowtype;
  v_service_name text;
begin
  select * into v_booking from public.provider_bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if not public.is_provider_member(v_booking.provider_id, 'bookings.manage', v_booking.department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_booking.status <> 'requested' then raise exception 'Booking has already been decided'; end if;
  if p_decision not in ('confirmed', 'declined') then raise exception 'Decision must be confirmed or declined'; end if;
  select name into v_service_name from public.provider_catalogue_items where id = v_booking.catalogue_item_id;
  update public.provider_bookings set status = p_decision, provider_note = nullif(trim(p_provider_note), ''),
    suggested_starts_at = p_suggested_starts_at,
    suggested_ends_at = case when p_suggested_starts_at is null then null else p_suggested_starts_at + (v_booking.ends_at - v_booking.starts_at) end,
    decided_by = auth.uid(), decided_at = now(), updated_at = now() where id = p_booking_id;
  perform public.dispatch_notification(jsonb_build_array(jsonb_build_object(
    'user_id', v_booking.patient_id,
    'title', case when p_decision = 'confirmed' then 'Booking confirmed' else 'Booking declined' end,
    'body', coalesce('Your ' || v_service_name || ' booking was ' || p_decision || '.', 'Your booking was updated.'),
    'type', 'booking', 'metadata', jsonb_build_object('booking_id', p_booking_id, 'deep_link', '/Reminders/Appointments')
  )), null, 'consumer');
end;
$$;

create or replace function public.cancel_my_provider_booking(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_booking public.provider_bookings%rowtype;
begin
  select * into v_booking from public.provider_bookings where id = p_booking_id for update;
  if not found or v_booking.patient_id <> auth.uid() then raise exception 'Booking not found' using errcode = '42501'; end if;
  if v_booking.status not in ('requested', 'confirmed') then raise exception 'This booking cannot be cancelled'; end if;
  update public.provider_bookings set status = 'cancelled', cancellation_reason = nullif(trim(p_reason), ''), updated_at = now() where id = p_booking_id;
end;
$$;

create or replace function public.get_my_bookings()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'provider_id', b.provider_id, 'provider_name', p.name,
    'service_name', ci.name, 'starts_at', b.starts_at, 'ends_at', b.ends_at,
    'mode', b.mode, 'status', b.status, 'provider_note', b.provider_note,
    'suggested_starts_at', b.suggested_starts_at
  ) order by b.starts_at desc), '[]'::jsonb)
  from public.provider_bookings b
  join public.providers p on p.id = b.provider_id
  join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id
  where b.patient_id = (select auth.uid());
$$;

create or replace function public.get_my_provider_bookings(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_provider_member(p_provider_id, 'bookings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id, 'service_name', ci.name, 'starts_at', b.starts_at,
      'ends_at', b.ends_at, 'mode', b.mode, 'status', b.status,
      'patient_note', b.patient_note, 'suggested_starts_at', b.suggested_starts_at
    ) order by b.starts_at asc)
    from public.provider_bookings b
    join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id
    where b.provider_id = p_provider_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.set_catalogue_booking_settings(uuid, uuid, jsonb) from public;
revoke execute on function public.upsert_provider_booking_availability(uuid, uuid, jsonb) from public;
revoke execute on function public.get_public_provider_booking_profile(uuid) from public;
revoke execute on function public.get_public_provider_trust(uuid) from public;
revoke execute on function public.get_provider_booking_slots(uuid, uuid, date) from public;
revoke execute on function public.request_provider_booking(uuid, uuid, timestamptz, text, text) from public;
revoke execute on function public.decide_provider_booking(uuid, text, text, timestamptz) from public;
revoke execute on function public.cancel_my_provider_booking(uuid, text) from public;
revoke execute on function public.get_my_bookings() from public;
revoke execute on function public.get_my_provider_bookings(uuid) from public;
grant execute on function public.set_catalogue_booking_settings(uuid, uuid, jsonb),
  public.upsert_provider_booking_availability(uuid, uuid, jsonb),
  public.get_public_provider_booking_profile(uuid), public.get_public_provider_trust(uuid),
  public.get_provider_booking_slots(uuid, uuid, date),
  public.request_provider_booking(uuid, uuid, timestamptz, text, text),
  public.decide_provider_booking(uuid, text, text, timestamptz),
  public.cancel_my_provider_booking(uuid, text), public.get_my_bookings(),
  public.get_my_provider_bookings(uuid) to authenticated;
grant execute on function public.set_catalogue_booking_settings(uuid, uuid, jsonb),
  public.upsert_provider_booking_availability(uuid, uuid, jsonb),
  public.get_public_provider_booking_profile(uuid), public.get_public_provider_trust(uuid),
  public.get_provider_booking_slots(uuid, uuid, date),
  public.request_provider_booking(uuid, uuid, timestamptz, text, text),
  public.decide_provider_booking(uuid, text, text, timestamptz),
  public.cancel_my_provider_booking(uuid, text), public.get_my_bookings(),
  public.get_my_provider_bookings(uuid) to service_role;

notify pgrst, 'reload schema';
