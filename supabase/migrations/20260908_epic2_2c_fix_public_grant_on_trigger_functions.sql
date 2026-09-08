-- Correction to 20260908_epic2_2b_revoke_excess_trigger_grants.sql:
-- PostgreSQL grants EXECUTE on every new function to the PUBLIC
-- pseudo-role by default at creation time, separately from Supabase's
-- named-role default privileges. "REVOKE ... FROM anon, authenticated"
-- does not touch that PUBLIC grant, and since every real role is
-- implicitly a member of PUBLIC, anon/authenticated still inherited
-- EXECUTE through it -- confirmed via has_function_privilege() returning
-- true for anon/authenticated on all 8 trigger functions after the prior
-- migration, and via pg_proc.proacl showing a bare "=X/postgres" entry
-- (the PUBLIC grant) with no explicit anon/authenticated entries at all.
-- The previous revoke was a no-op. Revoking from PUBLIC is what actually
-- closes it -- verified: has_function_privilege() is now false for both
-- roles on all 8.

revoke execute on function public.assign_user_public_id() from public;
revoke execute on function public.handle_enquiry_response_notify() from public;
revoke execute on function public.handle_exercise_session_completed() from public;
revoke execute on function public.handle_med_enquiry_status_notify() from public;
revoke execute on function public.refresh_top_rated_snapshot() from public;
revoke execute on function public.sync_digital_cv_from_application() from public;
revoke execute on function public.sync_facility_flag_to_top_rated() from public;
revoke execute on function public.sync_plasence_library_publication() from public;

-- Attempted the same fix for future functions (also targeting PUBLIC this
-- time, not just anon/authenticated). It does NOT reliably work either --
-- verified by creating a throwaway function afterward and finding it still
-- had anon/authenticated EXECUTE despite pg_default_acl showing the
-- expected restricted default for the `postgres` role. Something in
-- Supabase's platform re-applies baseline Data API grants to new functions
-- independent of pg_default_acl; no SQL-only way to prevent it was found.
-- Left in as defense-in-depth, but the real prevention is process: every
-- future SECURITY DEFINER function's own creation migration must include
-- an explicit REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated
-- immediately after CREATE FUNCTION, checked in review -- not something a
-- schema-level default can be trusted to guarantee.
alter default privileges in schema public revoke execute on functions from public;
