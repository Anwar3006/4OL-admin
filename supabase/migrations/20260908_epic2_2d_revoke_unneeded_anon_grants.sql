-- Epic 2.2 (TASKS.md), third slice: 17 more anon-executable SECURITY
-- DEFINER functions, each cleared through three independent checks before
-- touching anything (given the earlier near-miss on the mobile rpcJson()
-- wrapper pattern):
--   1. Whole-source substring search (not just `.rpc(` literals) across
--      both repos -- zero real mobile caller for any of the 17. Several
--      (award_fitcoins_capped, enforce_read_quota, get_fitcoin_config,
--      get_most_used_fitness_plans, log_admin_read, report_bot_signal) have
--      no real admin caller either -- their only "hit" was generated FK
--      metadata in database.types.ts, not actual application code.
--   2. Every RLS policy across the whole public schema that's evaluated
--      for `anon` (roles `{public}` or `{anon,authenticated}`) was checked
--      for a reference to any of these 17 names -- none appear. (This is
--      NOT true of is_admin/get_user_app_role/is_app_admin, which gate
--      real anon-readable policies on job_postings, subscription_plans and
--      fitness_plans -- those three are correctly left untouched.)
--   3. Cross-function call graph checked for indirect exposure (e.g. a
--      trigger calling one of these internally) -- the one hit,
--      handle_exercise_session_completed -> award_fitcoins_capped, doesn't
--      need a grant either: that trigger function is itself SECURITY
--      DEFINER and runs with its owner's privileges regardless of the
--      external caller's role.
-- Explicitly excluded from this batch despite matching the same surface
-- pattern: get_public_app_config (returns non-sensitive platform contact
-- info by design, clearly meant to be pre-login-readable even though no
-- current caller was found), issue_canary and report_canary_hit (a
-- security-canary/honeypot pair -- issue_canary already self-guards on
-- auth.uid() IS NULL, and report_canary_hit is meant to be triggerable by
-- whoever trips the canary, which may be an anonymous attacker; revoking
-- anon here would defeat the mechanism, not harden it).
--
-- Only `anon` is revoked, not `authenticated` -- several of these are
-- called from admin `data/` hooks (browser client, real authenticated
-- staff sessions), which this deliberately leaves alone; distinguishing
-- admin-API-only (service_role, needs neither) from admin-browser-client
-- (needs authenticated) precisely for all 17 was not done here.
--
-- is_conversation_member had the same PUBLIC-grant issue found and fixed
-- in epic2_2c for the trigger functions (a bare "=X" ACL entry alongside
-- the named anon grant) -- revoked from both. Verified live: all 17 now
-- has_function_privilege(anon, ..., EXECUTE) = false,
-- has_function_privilege(authenticated, ..., EXECUTE) = true, and spot
-- calls (get_fitcoin_config, get_healthy_living_kpi_stats) still succeed
-- as `authenticated`.

revoke execute on function public.award_fitcoins_capped(uuid, text, integer, uuid) from anon;
revoke execute on function public.enforce_read_quota(text, integer, integer) from anon;
revoke execute on function public.get_body_part_stats() from anon;
revoke execute on function public.get_fitcoin_config() from anon;
revoke execute on function public.get_fitness_ai_log_stats(integer) from anon;
revoke execute on function public.get_fitness_health_sync_stats() from anon;
revoke execute on function public.get_fitness_schedule_stats() from anon;
revoke execute on function public.get_fitness_users(integer, integer, text) from anon;
revoke execute on function public.get_healthy_living_analytics() from anon;
revoke execute on function public.get_healthy_living_kpi_stats() from anon;
revoke execute on function public.get_most_used_fitness_plans(integer) from anon;
revoke execute on function public.get_registrar_trails(integer) from anon;
revoke execute on function public.get_symptom_analytics() from anon;
revoke execute on function public.get_transactions_overview() from anon;
revoke execute on function public.log_admin_read(text, integer, jsonb) from anon;
revoke execute on function public.report_bot_signal(text, jsonb) from anon;
revoke execute on function public.is_conversation_member(uuid) from anon, public;
