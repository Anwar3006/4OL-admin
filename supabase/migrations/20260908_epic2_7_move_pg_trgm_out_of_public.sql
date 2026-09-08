-- Epic 2.7 (TASKS.md): pg_trgm was the one extension left in `public`
-- (ltree, pg_net, pg_stat_statements, pgcrypto, postgis, uuid-ossp already
-- live in the pre-existing `extensions` schema). Moving it is normally
-- transparent -- the 14 GIN trigram indexes across 9 tables resolve their
-- operator class by OID, not by schema-qualified name, so they keep
-- working unrebuilt -- but any function with an explicit
-- `search_path=public` (excluding `extensions`) that calls similarity()
-- unqualified breaks immediately. Checked precisely (not a broad `%`
-- regex, which false-positived on ltree's own `%` operator and plain
-- arithmetic modulo): exactly 3 functions call similarity()/word_similarity
-- and lack `extensions` in their search_path. The database's own default
-- search_path already includes `extensions` ("$user", public, extensions),
-- so admin_global_search (no explicit search_path override) was never at
-- risk; global_search (v1) and search_drug_names don't use trgm at all.
--
-- Verified in a rolled-back transaction before applying for real: with
-- both the search_path fix and the extension move applied together,
-- global_search_v2('test', 5) returns correct ranked results across
-- facilities/conditions/drugs (5 rows, real titles/ranks) -- confirming
-- the fix, not just the absence of an error. Verified again live after
-- applying: global_search_v2/search_drugs both work as `authenticated`,
-- and EXPLAIN confirms the trigram GIN index on facility_profile is still
-- used (Index Only Scan, not a sequential-scan fallback).

alter function public.global_search_v2(text, integer) set search_path = public, extensions;
alter function public.search_drugs(text, integer) set search_path = public, extensions;
alter function public.backfill_medication_drug_ids() set search_path = public, extensions;

alter extension pg_trgm set schema extensions;
