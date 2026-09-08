-- Epic 2.2 (TASKS.md), first slice: pin search_path on the 19 SECURITY
-- DEFINER functions the advisor flags as mutable-search-path. A definer
-- function without a pinned search_path resolves unqualified names against
-- the CALLER's search_path, not a fixed one -- a caller who can create
-- objects in a schema earlier in their own path can shadow a catalog
-- function/table and have this function operate on their object while
-- running with the definer's elevated privileges. Two of the 19
-- (get_user_app_role, increment_challenge_view_count) are also
-- anon-executable, making this a real, unauthenticated privilege-escalation
-- vector today, not just hygiene.
--
-- Safe and non-breaking: this only changes what an UNQUALIFIED reference
-- resolves to, and every function here already references only public/
-- pg_catalog objects (the app has one schema). No behavior change for a
-- correctly-written function; closes the hijack path for all of them.
-- Verified: get_user_app_role() and global_search('test') still execute
-- correctly as `authenticated` after this change.

alter function public.auto_cleanup_old_notifications() set search_path = pg_catalog, public;
alter function public.award_fitcoins(p_user_id uuid, p_amount numeric, p_transaction_type character varying, p_reference_id uuid) set search_path = pg_catalog, public;
alter function public.create_ibp_profile(p_user_id text, p_first_name text, p_last_name text, p_phone text, p_user_type text, p_role text, p_ibp_data jsonb) set search_path = pg_catalog, public;
alter function public.facility_has_privilege(p_facility_id uuid, p_privilege text) set search_path = pg_catalog, public;
alter function public.fn_create_group_conversation(p_avatar_url text, p_name text, p_description text, p_created_by text, p_member_ids text[]) set search_path = pg_catalog, public;
alter function public.fn_log_admin_activity() set search_path = pg_catalog, public;
alter function public.fn_mark_conversation_read(p_conversation_id uuid, p_user_id text) set search_path = pg_catalog, public;
alter function public.get_dashboard_metrics() set search_path = pg_catalog, public;
alter function public.get_user_app_role() set search_path = pg_catalog, public;
alter function public.global_search(search_term text) set search_path = pg_catalog, public;
alter function public.handle_outdoor_event_session_completed() set search_path = pg_catalog, public;
alter function public.increment_challenge_view_count(challenge_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.increment_condition_view_count(condition_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.increment_exercise_view_count(exercise_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.join_fitness_challenge(challenge_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.join_fitness_outdoor_event(event_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.leave_fitness_outdoor_event(event_id_param uuid, user_id_param uuid) set search_path = pg_catalog, public;
alter function public.sync_outdoor_event_participant_count() set search_path = pg_catalog, public;
alter function public.trigger_delete_read_reminder_notifications() set search_path = pg_catalog, public;
