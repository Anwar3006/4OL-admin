-- P2-02 · Practitioner workspace.
--
-- Practitioner scheduling builds on P2-01's generic booking tables rather
-- than creating a parallel appointment model. These RPCs make the sensitive
-- provider views narrowly available to members with the relevant permission.

create or replace function public.get_provider_booking_slots(
  p_provider_id uuid,
  p_catalogue_item_id uuid,
  p_date date,
  p_mode text
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
  v_open time;
  v_close time;
  v_interval integer := 30;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slots jsonb := '[]'::jsonb;
  v_business_hours jsonb;
  v_availability record;
  v_has_configured_availability boolean := false;
begin
  if p_mode not in ('clinic', 'video', 'home') then
    raise exception 'Unsupported consultation mode' using errcode = '22023';
  end if;
  if p_date < (now() at time zone 'Africa/Accra')::date then return v_slots; end if;

  select coalesce(ci.duration_minutes, 30), ci.booking_capacity, p.business_hours
    into v_duration, v_capacity, v_business_hours
  from public.provider_catalogue_items ci
  join public.providers p on p.id = ci.provider_id
  where ci.id = p_catalogue_item_id and ci.provider_id = p_provider_id
    and ci.status = 'published' and ci.is_bookable and p.status = 'active'
    and p_mode = any(ci.booking_modes);
  if not found then return v_slots; end if;

  select exists (
    select 1
    from public.provider_booking_availability a
    where a.provider_id = p_provider_id and a.active
      and a.weekday = extract(dow from p_date)::smallint
      and (a.catalogue_item_id = p_catalogue_item_id or a.catalogue_item_id is null)
  ) into v_has_configured_availability;

  select * into v_availability
  from public.provider_booking_availability a
  where a.provider_id = p_provider_id and a.active
    and a.weekday = extract(dow from p_date)::smallint
    and (a.catalogue_item_id = p_catalogue_item_id or a.catalogue_item_id is null)
    and a.mode = p_mode
  order by (a.catalogue_item_id is not null) desc
  limit 1;

  if found then
    v_open := v_availability.starts_at;
    v_close := v_availability.ends_at;
    v_interval := v_availability.slot_interval_minutes;
  elsif v_has_configured_availability then
    -- Once a provider configures a day's availability, an omitted mode is
    -- deliberately unavailable rather than silently inheriting business hours.
    return v_slots;
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
    from generate_series(v_open, v_close - make_interval(mins => v_duration), make_interval(mins => v_interval)) candidate(slot_time)
  loop
    v_slot_end := v_slot_start + make_interval(mins => v_duration);
    if v_slot_start <= now() then continue; end if;
    if exists (
      select 1 from public.provider_booking_blocks x
      where x.provider_id = p_provider_id and x.starts_at < v_slot_end and x.ends_at > v_slot_start
    ) then continue; end if;
    if (select count(*) from public.provider_bookings b
        where b.provider_id = p_provider_id and b.catalogue_item_id = p_catalogue_item_id
          and b.status in ('requested', 'confirmed')
          and b.starts_at < v_slot_end and b.ends_at > v_slot_start) >= v_capacity then continue; end if;
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
  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text || p_catalogue_item_id::text || p_starts_at::text || p_mode, 0));
  select coalesce(duration_minutes, 30), booking_department_id, name
    into v_duration, v_department_id, v_service_name
  from public.provider_catalogue_items
  where id = p_catalogue_item_id and provider_id = p_provider_id and status = 'published'
    and is_bookable and p_mode = any(booking_modes);
  if not found then raise exception 'This service cannot be booked'; end if;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  select exists (
    select 1 from jsonb_array_elements(public.get_provider_booking_slots(
      p_provider_id, p_catalogue_item_id, (p_starts_at at time zone 'Africa/Accra')::date, p_mode
    )) slot(value)
    where (slot.value->>'starts_at')::timestamptz = p_starts_at
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

create or replace function public.get_my_practitioner_workspace(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'consult_modes', coalesce(d.consult_modes, array['clinic']::text[]),
      'home_visit_radius_km', d.home_visit_radius_km,
      'languages', coalesce(d.languages, array['en']::text[]),
      'verification', case when h.id is null then null else jsonb_build_object(
        'id', h.id, 'license_type', h.license_type, 'license_number', h.license_number,
        'issuing_body', h.issuing_body, 'license_expiry', h.license_expiry,
        'specialty', h.specialty, 'verification_status', h.verification_status
      ) end
    )
    from public.providers p
    left join public.provider_practitioner_details d on d.provider_id = p.id
    left join public.hcp_verifications h on h.id = d.hcp_verification_id
    where p.id = p_provider_id and p.kind = 'practitioner'
  );
end;
$$;

create or replace function public.upsert_my_practitioner_details(p_provider_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_modes text[];
  v_languages text[];
  v_radius numeric;
  v_hcp_id uuid;
  v_owner_id uuid;
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select owner_id into v_owner_id from public.providers where id = p_provider_id and kind = 'practitioner';
  if v_owner_id is null then raise exception 'Practitioner provider not found'; end if;

  select coalesce(array_agg(distinct value), array['clinic']::text[]) into v_modes
  from jsonb_array_elements_text(coalesce(p_patch->'consult_modes', '["clinic"]'::jsonb)) value
  where value in ('clinic', 'video', 'home');
  if cardinality(v_modes) <> jsonb_array_length(coalesce(p_patch->'consult_modes', '["clinic"]'::jsonb)) then
    raise exception 'Consult modes must be clinic, video, or home' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct lower(trim(value))), array['en']::text[]) into v_languages
  from jsonb_array_elements_text(coalesce(p_patch->'languages', '["en"]'::jsonb)) value
  where nullif(trim(value), '') is not null;
  v_radius := nullif(p_patch->>'home_visit_radius_km', '')::numeric;
  if v_radius is not null and (v_radius < 0 or v_radius > 200) then
    raise exception 'Home-visit radius must be between 0 and 200 km' using errcode = '22023';
  end if;
  v_hcp_id := nullif(p_patch->>'hcp_verification_id', '')::uuid;
  if v_hcp_id is not null and not exists (
    select 1 from public.hcp_verifications h where h.id = v_hcp_id and h.user_id = v_owner_id
  ) then
    raise exception 'The selected licence does not belong to this practitioner' using errcode = '42501';
  end if;

  insert into public.provider_practitioner_details (
    provider_id, hcp_verification_id, consult_modes, home_visit_radius_km, languages
  ) values (p_provider_id, v_hcp_id, v_modes, v_radius, v_languages)
  on conflict (provider_id) do update set
    hcp_verification_id = excluded.hcp_verification_id,
    consult_modes = excluded.consult_modes,
    home_visit_radius_km = excluded.home_visit_radius_km,
    languages = excluded.languages;
end;
$$;

create or replace function public.get_my_practitioner_schedule(
  p_provider_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_to < p_from or p_to > p_from + 31 then
    raise exception 'Schedule range must be between one and 32 days' using errcode = '22023';
  end if;
  if not public.is_provider_member(p_provider_id, 'bookings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id, 'service_name', ci.name, 'starts_at', b.starts_at, 'ends_at', b.ends_at,
      'mode', b.mode, 'status', b.status, 'patient_name', coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member'),
      'patient_note', b.patient_note, 'provider_note', b.provider_note,
      'suggested_starts_at', b.suggested_starts_at
    ) order by b.starts_at)
    from public.provider_bookings b
    join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id
    join public.user_profiles u on u.user_id = b.patient_id
    where b.provider_id = p_provider_id
      and b.starts_at >= (p_from::timestamp at time zone 'Africa/Accra')
      and b.starts_at < ((p_to + 1)::timestamp at time zone 'Africa/Accra')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_practitioner_patients(p_provider_id uuid)
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
      'patient_id', x.patient_id,
      'name', x.patient_name,
      'next_appointment_at', x.next_appointment_at,
      'last_appointment_at', x.last_appointment_at,
      'appointment_count', x.appointment_count
    ) order by x.next_appointment_at nulls last, x.patient_name)
    from (
      select b.patient_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member') as patient_name,
        min(b.starts_at) filter (where b.starts_at >= now() and b.status in ('requested', 'confirmed')) as next_appointment_at,
        max(b.starts_at) filter (where b.status in ('confirmed', 'completed', 'no_show')) as last_appointment_at,
        count(*)::integer as appointment_count
      from public.provider_bookings b
      join public.user_profiles u on u.user_id = b.patient_id
      where b.provider_id = p_provider_id
      group by b.patient_id, u.first_name, u.last_name
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.upsert_provider_booking_block(
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
  v_starts_at timestamptz := (p_patch->>'starts_at')::timestamptz;
  v_ends_at timestamptz := (p_patch->>'ends_at')::timestamptz;
begin
  if v_starts_at is null or v_ends_at is null or v_ends_at <= v_starts_at then
    raise exception 'A block needs a valid start and end time' using errcode = '22023';
  end if;
  if not public.is_provider_member(p_provider_id, 'bookings.manage', v_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_id is null then
    insert into public.provider_booking_blocks (provider_id, department_id, starts_at, ends_at, reason, created_by)
    values (p_provider_id, v_department_id, v_starts_at, v_ends_at, nullif(trim(p_patch->>'reason'), ''), auth.uid())
    returning id into v_id;
  else
    update public.provider_booking_blocks
    set department_id = v_department_id, starts_at = v_starts_at, ends_at = v_ends_at,
      reason = nullif(trim(p_patch->>'reason'), '')
    where id = p_id and provider_id = p_provider_id
    returning id into v_id;
    if v_id is null then raise exception 'Schedule block not found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_provider_booking_block(p_provider_id uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_department_id uuid;
begin
  select department_id into v_department_id from public.provider_booking_blocks where id = p_id and provider_id = p_provider_id;
  if not found then raise exception 'Schedule block not found'; end if;
  if not public.is_provider_member(p_provider_id, 'bookings.manage', v_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.provider_booking_blocks where id = p_id and provider_id = p_provider_id;
end;
$$;

revoke execute on function public.get_provider_booking_slots(uuid, uuid, date, text) from public;
revoke execute on function public.get_my_practitioner_workspace(uuid) from public;
revoke execute on function public.upsert_my_practitioner_details(uuid, jsonb) from public;
revoke execute on function public.get_my_practitioner_schedule(uuid, date, date) from public;
revoke execute on function public.get_my_practitioner_patients(uuid) from public;
revoke execute on function public.upsert_provider_booking_block(uuid, uuid, jsonb) from public;
revoke execute on function public.delete_provider_booking_block(uuid, uuid) from public;
grant execute on function public.get_provider_booking_slots(uuid, uuid, date, text),
  public.get_my_practitioner_workspace(uuid), public.upsert_my_practitioner_details(uuid, jsonb),
  public.get_my_practitioner_schedule(uuid, date, date), public.get_my_practitioner_patients(uuid),
  public.upsert_provider_booking_block(uuid, uuid, jsonb), public.delete_provider_booking_block(uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
