-- P0-13 follow-up, two advisor findings introduced by the P0-13 migrations
-- (prod migration: p013_search_providers_grants_and_helper_search_path).
--
-- 1. search_providers was granted to anon "matching global_search's reach", but
--    global_search (and get_facilities_map) are NOT executable by anon, so the
--    stated precedent was wrong. The only caller planned is the signed-in mobile
--    directory; nothing calls it yet. Match the existing search RPCs:
--    authenticated + service_role only. (Re-grant to anon if a public web
--    directory is ever built.)
revoke execute on function public.search_providers(public.provider_kind, text, text, double precision, double precision, numeric, text, int, int) from anon;

-- 2. _map_legacy_facility_type_filter is a pure text CASE with no object
--    references, so an empty search_path is safe. Clears function_search_path_mutable.
alter function public._map_legacy_facility_type_filter(text) set search_path = '';
