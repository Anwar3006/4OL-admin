-- Rollback for 20260921163000_search_providers_rpc.sql
-- (Written after the fact: the original migration shipped without one.)
drop function if exists public.search_providers(public.provider_kind, text, text, double precision, double precision, numeric, text, int, int);
