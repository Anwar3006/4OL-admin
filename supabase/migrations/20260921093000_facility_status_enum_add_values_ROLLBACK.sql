-- Rollback for 20260921093000_facility_status_enum_add_values.sql
--
-- Postgres cannot drop a single enum value. Rolling back for real means
-- rebuilding facility_status_enum without 'suspended'/'draft' and swapping
-- every column that uses it — only do this if nothing has been set to either
-- value yet. Written to run whether this runs before or after the
-- facility_profile -> providers rename.
do $$
declare
  v_table regclass := coalesce(to_regclass('public.providers'), to_regclass('public.facility_profile'));
begin
  if v_table is null then
    raise exception 'Neither public.providers nor public.facility_profile exists';
  end if;
  if exists (
    select 1 from (select status from public.providers) t where t.status::text in ('suspended','draft')
  ) then
    raise exception 'Rows use suspended/draft — rebuild facility_status_enum manually, do not run this blind';
  end if;
exception when undefined_table then
  if exists (
    select 1 from (select status from public.facility_profile) t where t.status::text in ('suspended','draft')
  ) then
    raise exception 'Rows use suspended/draft — rebuild facility_status_enum manually, do not run this blind';
  end if;
end $$;

alter type public.facility_status_enum rename to facility_status_enum_old;

create type public.facility_status_enum as enum ('pending','active','rejected','inactive');

do $$
declare
  v_table regclass := coalesce(to_regclass('public.providers'), to_regclass('public.facility_profile'));
begin
  execute format(
    'alter table %s alter column status type public.facility_status_enum using status::text::public.facility_status_enum, alter column status set default ''pending''::public.facility_status_enum',
    v_table
  );
end $$;

drop type public.facility_status_enum_old;
