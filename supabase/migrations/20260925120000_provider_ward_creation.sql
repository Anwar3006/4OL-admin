-- Care facilities need a provider-side first-write path: P1-08c made ward
-- updates safe, but an empty hospital could not create its first ward.

-- A tracker is one-to-one with a care facility.  The original tracker table
-- predates the provider model and did not enforce that invariant, which made
-- a concurrent first-ward request ambiguous.
create unique index if not exists bed_tracker_facilities_facility_id_unique
  on public.bed_tracker_facilities (facility_id);

create or replace function public.create_provider_ward(
  p_provider_id uuid,
  p_ward_type text,
  p_total integer,
  p_occupied integer default 0,
  p_department_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tracker_id uuid;
  v_ward_id uuid;
  v_ward_type text := nullif(trim(p_ward_type), '');
begin
  if not public.is_provider_member(p_provider_id, 'beds.update', p_department_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.providers
    where id = p_provider_id and kind = 'care_facility'
  ) then
    raise exception 'Care facility not found' using errcode = '22023';
  end if;

  if v_ward_type is null or v_ward_type not in (
    'general', 'icu', 'surgical', 'medical', 'maternity', 'pediatric',
    'psychiatric', 'geriatric'
  ) then
    raise exception 'Choose a supported ward type' using errcode = '22023';
  end if;
  if p_total is null or p_occupied is null or p_total < 0 or p_occupied < 0 or p_occupied > p_total then
    raise exception 'Occupied beds must be between zero and total beds' using errcode = '22023';
  end if;

  if p_department_id is not null and not exists (
    select 1 from public.provider_departments
    where id = p_department_id and provider_id = p_provider_id and status = 'active'
  ) then
    raise exception 'Department not found' using errcode = '22023';
  end if;

  -- The tracker is one-to-one with a facility. It is created lazily here so
  -- normal hospitals do not need an admin-only seed before they can publish
  -- their first live count.
  insert into public.bed_tracker_facilities (facility_id, updated_by)
  values (p_provider_id, (select auth.uid()))
  on conflict (facility_id) do update
    set updated_by = excluded.updated_by,
        last_updated_at = now()
  returning id into v_tracker_id;

  insert into public.bed_tracker_wards
    (bed_tracker_facility_id, ward_type, total_beds, occupied_beds, department_id,
     updated_by, update_source)
  values
    (v_tracker_id, v_ward_type, p_total, p_occupied, p_department_id,
     (select auth.uid()), 'app')
  returning id into v_ward_id;

  return jsonb_build_object('ok', true, 'ward_id', v_ward_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate_ward');
end;
$function$;

revoke all on function public.create_provider_ward(uuid, text, integer, integer, uuid) from public, anon;
grant execute on function public.create_provider_ward(uuid, text, integer, integer, uuid) to authenticated;

notify pgrst, 'reload schema';
