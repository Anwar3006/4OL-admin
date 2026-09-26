-- P2-02 · Trainer workspace.
-- Group sessions use the existing booking engine. This migration adds a
-- server-issued attendee pass and trainer-only RPCs for the operational views.

alter table public.provider_booking_group_attendees
  add column if not exists qr_token uuid not null default gen_random_uuid(),
  add column if not exists pass_issued_at timestamptz not null default now();

create unique index if not exists provider_booking_group_attendees_qr_token_idx
  on public.provider_booking_group_attendees (qr_token);

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
  v_item_type text;
  v_available boolean;
begin
  if v_patient_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_provider_id::text || p_catalogue_item_id::text || p_starts_at::text || p_mode, 0
  ));

  select coalesce(duration_minutes, 30), booking_department_id, name, item_type
    into v_duration, v_department_id, v_service_name, v_item_type
  from public.provider_catalogue_items
  where id = p_catalogue_item_id and provider_id = p_provider_id
    and status = 'published' and is_bookable and p_mode = any(booking_modes);
  if not found then raise exception 'This service cannot be booked'; end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  select exists (
    select 1
    from jsonb_array_elements(public.get_provider_booking_slots(
      p_provider_id, p_catalogue_item_id,
      (p_starts_at at time zone 'Africa/Accra')::date, p_mode
    )) slot(value)
    where (slot.value->>'starts_at')::timestamptz = p_starts_at
  ) into v_available;
  if not v_available then raise exception 'That time is no longer available'; end if;

  insert into public.provider_bookings (
    provider_id, catalogue_item_id, department_id, patient_id, starts_at, ends_at, mode, patient_note
  ) values (
    p_provider_id, p_catalogue_item_id, v_department_id, v_patient_id,
    p_starts_at, v_ends_at, p_mode, nullif(trim(p_patient_note), '')
  ) returning id into v_booking_id;

  -- One attendee/pass per member's group-session booking. Capacity is still
  -- enforced atomically by the locked booking slot above.
  if v_item_type = 'session' then
    insert into public.provider_booking_group_attendees (booking_id, attendee_user_id)
    values (v_booking_id, v_patient_id);
  end if;

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

create or replace function public.get_my_trainer_workspace(p_provider_id uuid)
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
  return coalesce((
    select jsonb_build_object(
      'bio', t.bio,
      'certifications', coalesce(t.certifications, array[]::text[]),
      'specialties', coalesce(t.specialties, array[]::text[]),
      'years_experience', t.years_experience,
      'profile_video_url', t.profile_video_url,
      'social_links', coalesce(t.social_links, '{}'::jsonb)
    )
    from public.fitness_trainers t
    where t.provider_id = p_provider_id
  ), '{}'::jsonb);
end;
$$;

create or replace function public.upsert_my_trainer_workspace(p_provider_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner_id uuid;
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select owner_id into v_owner_id
  from public.providers where id = p_provider_id and kind = 'trainer';
  if v_owner_id is null then raise exception 'Trainer provider not found'; end if;

  insert into public.fitness_trainers (
    user_id, provider_id, bio, certifications, specialties, years_experience,
    profile_video_url, social_links, status
  ) values (
    v_owner_id, p_provider_id,
    nullif(trim(p_patch->>'bio'), ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_patch->'certifications', '[]'::jsonb))), array[]::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_patch->'specialties', '[]'::jsonb))), array[]::text[]),
    nullif(p_patch->>'years_experience', '')::integer,
    nullif(trim(p_patch->>'profile_video_url'), ''),
    coalesce(p_patch->'social_links', '{}'::jsonb),
    'active'
  )
  on conflict (provider_id) do update set
    bio = excluded.bio,
    certifications = excluded.certifications,
    specialties = excluded.specialties,
    years_experience = excluded.years_experience,
    profile_video_url = excluded.profile_video_url,
    social_links = excluded.social_links,
    updated_at = now();
end;
$$;

create or replace function public.get_my_trainer_sessions(
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
      'booking_id', b.id, 'session_id', ci.id, 'name', ci.name,
      'starts_at', b.starts_at, 'ends_at', b.ends_at, 'status', b.status,
      'capacity', ci.booking_capacity, 'attendee_count', (
        select count(*) from public.provider_bookings same_slot
        where same_slot.provider_id = b.provider_id
          and same_slot.catalogue_item_id = b.catalogue_item_id
          and same_slot.starts_at = b.starts_at
          and same_slot.status in ('requested', 'confirmed')
      ),
      'member_name', coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member')
    ) order by b.starts_at)
    from public.provider_bookings b
    join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id and ci.item_type = 'session'
    join public.user_profiles u on u.user_id = b.patient_id
    where b.provider_id = p_provider_id
      and b.starts_at >= (p_from::timestamp at time zone 'Africa/Accra')
      and b.starts_at < ((p_to + 1)::timestamp at time zone 'Africa/Accra')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_trainer_clients(p_provider_id uuid)
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
      'user_id', b.patient_id,
      'name', coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member'),
      'bookings_count', count(*),
      'attended_count', count(a.checked_in_at),
      'next_session_at', min(b.starts_at) filter (where b.starts_at >= now() and b.status in ('requested', 'confirmed')),
      'last_session_at', max(b.starts_at) filter (where b.starts_at < now())
    ) order by min(b.starts_at) filter (where b.starts_at >= now() and b.status in ('requested', 'confirmed')) nulls last)
    from public.provider_bookings b
    join public.user_profiles u on u.user_id = b.patient_id
    left join public.provider_booking_group_attendees a
      on a.booking_id = b.id and a.attendee_user_id = b.patient_id
    where b.provider_id = p_provider_id and b.status in ('requested', 'confirmed', 'completed', 'no_show')
    group by b.patient_id, u.first_name, u.last_name
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_trainer_session_attendees(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v_provider_id uuid; v_department_id uuid;
begin
  select provider_id, department_id into v_provider_id, v_department_id
  from public.provider_bookings where id = p_booking_id;
  if v_provider_id is null or not public.is_provider_member(v_provider_id, 'bookings.manage', v_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'booking_id', b.id,
      'name', coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member'),
      'status', b.status,
      'checked_in_at', a.checked_in_at
    ) order by u.first_name, u.last_name)
    from public.provider_bookings b
    join public.user_profiles u on u.user_id = b.patient_id
    join public.provider_booking_group_attendees a on a.booking_id = b.id and a.attendee_user_id = b.patient_id
    where b.provider_id = v_provider_id
      and b.catalogue_item_id = (select catalogue_item_id from public.provider_bookings where id = p_booking_id)
      and b.starts_at = (select starts_at from public.provider_bookings where id = p_booking_id)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.check_in_group_attendee(
  p_provider_id uuid,
  p_qr_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_booking public.provider_bookings%rowtype; v_name text; v_checked_in_at timestamptz;
begin
  select b.* into v_booking
  from public.provider_booking_group_attendees a
  join public.provider_bookings b on b.id = a.booking_id
  join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id and ci.item_type = 'session'
  where a.qr_token = p_qr_token
  for update of a, b;
  if not found or v_booking.provider_id <> p_provider_id then
    raise exception 'Session pass not found' using errcode = 'P0002';
  end if;
  if not public.is_provider_member(p_provider_id, 'bookings.manage', v_booking.department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'This booking is not confirmed' using errcode = '22023';
  end if;
  update public.provider_booking_group_attendees
  set checked_in_at = coalesce(checked_in_at, now()), checked_in_by = auth.uid()
  where booking_id = v_booking.id and attendee_user_id = v_booking.patient_id
  returning checked_in_at into v_checked_in_at;
  select coalesce(nullif(trim(concat_ws(' ', first_name, last_name)), ''), 'Member') into v_name
  from public.user_profiles where user_id = v_booking.patient_id;
  return jsonb_build_object('booking_id', v_booking.id, 'name', v_name, 'checked_in_at', v_checked_in_at);
end;
$$;

create or replace function public.get_my_trainer_programmes(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v_owner_id uuid;
begin
  if not public.is_provider_member(p_provider_id, 'catalogue.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select owner_id into v_owner_id from public.providers where id = p_provider_id and kind = 'trainer';
  if v_owner_id is null then raise exception 'Trainer provider not found'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', fp.id, 'title', fp.title, 'description', fp.description,
      'duration_weeks', fp.duration_weeks, 'difficulty_level', fp.difficulty_level,
      'status', fp.status, 'is_premium', fp.is_premium, 'total_completions', fp.total_completions
    ) order by fp.updated_at desc)
    from public.fitness_plans fp
    where fp.author_id = v_owner_id and fp.author_type = 'trainer'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.upsert_my_trainer_programme(
  p_provider_id uuid,
  p_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_owner_id uuid; v_id uuid; v_provider_name text;
begin
  if not public.is_provider_member(p_provider_id, 'catalogue.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select owner_id, name into v_owner_id, v_provider_name
  from public.providers where id = p_provider_id and kind = 'trainer';
  if v_owner_id is null then raise exception 'Trainer provider not found'; end if;
  if nullif(trim(p_patch->>'title'), '') is null then raise exception 'Programme title is required' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.fitness_plans (
      title, description, difficulty_level, duration_weeks, workouts_per_week,
      goals, is_premium, status, author_id, author_type, coach_display_name
    ) values (
      trim(p_patch->>'title'), nullif(trim(p_patch->>'description'), ''),
      coalesce(nullif(trim(p_patch->>'difficulty_level'), ''), 'beginner'),
      greatest(1, least(coalesce(nullif(p_patch->>'duration_weeks', '')::integer, 4), 52)),
      greatest(1, least(coalesce(nullif(p_patch->>'workouts_per_week', '')::integer, 3), 7)),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_patch->'goals', '[]'::jsonb))), array[]::text[]),
      coalesce((p_patch->>'is_premium')::boolean, false), 'published',
      v_owner_id, 'trainer', v_provider_name
    ) returning id into v_id;
  else
    update public.fitness_plans set
      title = trim(p_patch->>'title'),
      description = nullif(trim(p_patch->>'description'), ''),
      difficulty_level = coalesce(nullif(trim(p_patch->>'difficulty_level'), ''), difficulty_level),
      duration_weeks = greatest(1, least(coalesce(nullif(p_patch->>'duration_weeks', '')::integer, duration_weeks), 52)),
      workouts_per_week = greatest(1, least(coalesce(nullif(p_patch->>'workouts_per_week', '')::integer, workouts_per_week), 7)),
      goals = coalesce(array(select jsonb_array_elements_text(coalesce(p_patch->'goals', '[]'::jsonb))), goals),
      is_premium = coalesce((p_patch->>'is_premium')::boolean, is_premium),
      updated_at = now()
    where id = p_id and author_id = v_owner_id and author_type = 'trainer'
    returning id into v_id;
    if v_id is null then raise exception 'Programme not found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.get_my_trainer_workspace(uuid) from public;
revoke all on function public.upsert_my_trainer_workspace(uuid, jsonb) from public;
revoke all on function public.get_my_trainer_sessions(uuid, date, date) from public;
revoke all on function public.get_my_trainer_clients(uuid) from public;
revoke all on function public.get_my_trainer_session_attendees(uuid) from public;
revoke all on function public.check_in_group_attendee(uuid, uuid) from public;
revoke all on function public.get_my_trainer_programmes(uuid) from public;
revoke all on function public.upsert_my_trainer_programme(uuid, uuid, jsonb) from public;
revoke all on function public.request_provider_booking(uuid, uuid, timestamptz, text, text) from public;

grant execute on function public.get_my_trainer_workspace(uuid),
  public.upsert_my_trainer_workspace(uuid, jsonb),
  public.get_my_trainer_sessions(uuid, date, date),
  public.get_my_trainer_clients(uuid),
  public.get_my_trainer_session_attendees(uuid),
  public.check_in_group_attendee(uuid, uuid),
  public.get_my_trainer_programmes(uuid),
  public.upsert_my_trainer_programme(uuid, uuid, jsonb),
  public.request_provider_booking(uuid, uuid, timestamptz, text, text)
to authenticated, service_role;

notify pgrst, 'reload schema';
