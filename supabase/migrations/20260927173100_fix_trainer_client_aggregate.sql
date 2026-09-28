-- Aggregates must be evaluated in a grouped subquery before JSON aggregation.

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
      'user_id', rows.user_id,
      'name', rows.name,
      'bookings_count', rows.bookings_count,
      'attended_count', rows.attended_count,
      'next_session_at', rows.next_session_at,
      'last_session_at', rows.last_session_at
    ) order by rows.next_session_at nulls last)
    from (
      select
        b.patient_id as user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member') as name,
        count(*) as bookings_count,
        count(a.checked_in_at) as attended_count,
        min(b.starts_at) filter (where b.starts_at >= now() and b.status in ('requested', 'confirmed')) as next_session_at,
        max(b.starts_at) filter (where b.starts_at < now()) as last_session_at
      from public.provider_bookings b
      join public.user_profiles u on u.user_id = b.patient_id
      left join public.provider_booking_group_attendees a
        on a.booking_id = b.id and a.attendee_user_id = b.patient_id
      where b.provider_id = p_provider_id and b.status in ('requested', 'confirmed', 'completed', 'no_show')
      group by b.patient_id, u.first_name, u.last_name
    ) rows
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_my_trainer_clients(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
