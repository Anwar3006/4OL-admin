-- Epic 2.2 (TASKS.md), fourth slice: 6 functions from epic2_2d (anon
-- already revoked there) turn out to have zero real caller at all --
-- not mobile, not any admin api/ or data/ file (their only "hit" in
-- epic2_2d's search was generated FK metadata in database.types.ts), not
-- any RLS policy (checked this time across ALL roles, not just
-- anon/public), and no internal cross-function call needing authenticated
-- specifically (award_fitcoins_capped's one caller,
-- handle_exercise_session_completed, is itself SECURITY DEFINER and runs
-- as its owner regardless of grants). Revoking `authenticated` too takes
-- them fully service-only, matching the Epic 2.3 table pattern. Verified
-- live: service_role still has EXECUTE, anon/authenticated do not.
--
-- is_conversation_member was checked the same way and explicitly NOT
-- included here: it gates real `{authenticated}`-scoped SELECT policies on
-- conversations/conversation_members/messages/facility_conversations.

revoke execute on function public.award_fitcoins_capped(uuid, text, integer, uuid) from authenticated;
revoke execute on function public.enforce_read_quota(text, integer, integer) from authenticated;
revoke execute on function public.get_fitcoin_config() from authenticated;
revoke execute on function public.get_most_used_fitness_plans(integer) from authenticated;
revoke execute on function public.log_admin_read(text, integer, jsonb) from authenticated;
revoke execute on function public.report_bot_signal(text, jsonb) from authenticated;
