-- Rollback for 20260921173000_p013_search_providers_grants_and_helper_search_path.sql
grant execute on function public.search_providers(public.provider_kind, text, text, double precision, double precision, numeric, text, int, int) to anon;
alter function public._map_legacy_facility_type_filter(text) reset search_path;
