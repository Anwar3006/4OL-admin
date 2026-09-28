-- PostgreSQL has no min(uuid). A stable booking handle for each grouped
-- session occurrence is selected by UUID ordering instead.

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
      'booking_id', rows.booking_id, 'session_id', rows.session_id,
      'name', rows.name, 'starts_at', rows.starts_at, 'ends_at', rows.ends_at,
      'status', rows.status, 'capacity', rows.capacity,
      'attendee_count', rows.attendee_count, 'member_name', rows.member_name
    ) order by rows.starts_at)
    from (
      select
        (array_agg(b.id order by b.id))[1] as booking_id,
        ci.id as session_id,
        ci.name,
        b.starts_at,
        b.ends_at,
        case when count(*) filter (where b.status = 'confirmed') > 0 then 'confirmed' else 'requested' end as status,
        ci.booking_capacity as capacity,
        count(*) filter (where b.status in ('requested', 'confirmed')) as attendee_count,
        min(coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Member')) as member_name
      from public.provider_bookings b
      join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id and ci.item_type = 'session'
      join public.user_profiles u on u.user_id = b.patient_id
      where b.provider_id = p_provider_id
        and b.starts_at >= (p_from::timestamp at time zone 'Africa/Accra')
        and b.starts_at < ((p_to + 1)::timestamp at time zone 'Africa/Accra')
      group by ci.id, ci.name, ci.booking_capacity, b.starts_at, b.ends_at
    ) rows
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_my_trainer_sessions(uuid, date, date) to authenticated, service_role;
notify pgrst, 'reload schema';
