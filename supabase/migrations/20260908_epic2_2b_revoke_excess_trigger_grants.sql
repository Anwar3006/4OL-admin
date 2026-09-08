-- Epic 2.2 (TASKS.md), second slice: 8 of the 206 SECURITY DEFINER
-- functions are trigger-only (confirmed via pg_trigger.tgfoid) but still
-- carry anon/authenticated EXECUTE grants from Supabase's default schema
-- privileges. Postgres invokes a trigger function through the trigger
-- mechanism itself, not as a direct call by the triggering role -- the
-- role performing the INSERT/UPDATE/DELETE needs privilege on the TABLE,
-- not EXECUTE on the trigger function. These grants only matter as a
-- direct-call surface: today, any anon or authenticated caller can invoke
-- e.g. handle_med_enquiry_status_notify() or
-- sync_digital_cv_from_application() directly via .rpc(), running
-- arbitrary trigger side-effects (notification dispatch, CV sync, top-rated
-- snapshot writes) outside the workflow that's supposed to trigger them.
--
-- Verified via full-text search of both repos' source (not just `.rpc(`
-- call sites, which missed real usage hidden behind local wrapper
-- functions like rpcJson() in the mobile Jobs/med-enquiry hooks -- see the
-- correction note in the PR): none of these 8 names appear anywhere in
-- application code. They are wired up purely as `CREATE TRIGGER ...
-- EXECUTE FUNCTION`.
--
-- The remaining ~190 anon/authenticated grants among the 206 all resolved
-- to a real caller once checked with the corrected whole-source search
-- (admin route, mobile hook, or an RLS policy predicate like is_admin()).
-- Classifying which of those are still over-broad needs stronger evidence
-- than static grep (e.g. production invocation logs) before touching any
-- of them, given several are load-bearing for already-installed mobile
-- builds -- left as a tracked follow-up, not forced through here.

revoke execute on function public.assign_user_public_id() from anon, authenticated;
revoke execute on function public.handle_enquiry_response_notify() from anon, authenticated;
revoke execute on function public.handle_exercise_session_completed() from anon, authenticated;
revoke execute on function public.handle_med_enquiry_status_notify() from anon, authenticated;
revoke execute on function public.refresh_top_rated_snapshot() from anon, authenticated;
revoke execute on function public.sync_digital_cv_from_application() from anon, authenticated;
revoke execute on function public.sync_facility_flag_to_top_rated() from anon, authenticated;
revoke execute on function public.sync_plasence_library_publication() from anon, authenticated;
