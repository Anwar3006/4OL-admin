drop function if exists public.create_provider_ward(uuid, text, integer, integer, uuid);
drop index if exists public.bed_tracker_facilities_facility_id_unique;
notify pgrst, 'reload schema';
