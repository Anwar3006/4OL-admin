do $$
begin
  if exists (select 1 from public.providers where provider_type = 'spa') then
    raise exception 'Cannot roll back provider type spa while providers use it';
  end if;
end;
$$;

delete from public.provider_type_requirements where provider_type = 'spa';
delete from public.provider_types where key = 'spa';

alter table public.provider_types
  drop constraint if exists provider_types_directory_category_chk,
  drop column if exists listing_entity;

notify pgrst, 'reload schema';
