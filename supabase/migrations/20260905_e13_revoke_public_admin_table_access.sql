-- E1.3 — RLS audit finding. APPLIED 5 Sept 2026; see docs/cleanup-handoff.md.
--
-- Nine tables carry a policy named `admin_full_access_*` defined as
--   FOR ALL TO public USING (true)
-- In Postgres `public` is not "the public schema" and not "logged-in users" —
-- it is EVERY role, including `anon`. Combined with the blanket
-- GRANT ALL ... TO anon these tables also carry, the practical effect is that
-- anyone holding the publishable anon key — which ships in the web bundle and
-- in every installed Expo build — can read, update and delete these tables.
--
-- Measured on 5 Sept 2026 by querying as the `anon` role:
--   admin_sessions ................ 701 rows readable
--                                   (session_token, ip_address, user_agent,
--                                    location; all 701 flagged is_active)
--   the other eight ............... 0 rows readable, because they are empty —
--                                   not because they are protected.
--
-- Every one of these eight tables is read ONLY from app/api/** through
-- getAdminClient(). service_role has rolbypassrls = true, so dropping the
-- policy changes nothing for the admin dashboard. Verified call site by call
-- site; the list is in docs/cleanup-handoff.md.
--
-- `fitness_content_schedule` is deliberately NOT in this migration. It is the
-- one table of the nine still read from the browser —
-- hooks/supabase-calls/useFitnessContentSchedule.ts, on the legacy anon
-- client. Dropping its policy would blank that feature silently, which is the
-- exact failure mode this epic exists to remove. It gets fixed when
-- features/fitness migrates and that read moves behind an API route.

begin;

drop policy if exists "admin_full_access_logs"       on public.admin_activity_logs;
drop policy if exists "admin_full_access_sessions"   on public.admin_sessions;
drop policy if exists "admin_full_access_threats"    on public.security_threats;
drop policy if exists "admin_full_access_moderation" on public.content_moderation_flags;
drop policy if exists "admin_full_access_templates"  on public.notification_templates;
drop policy if exists "admin_full_access_rules"      on public.notification_automation_rules;
drop policy if exists "admin_full_access_broadcasts" on public.platform_broadcasts;
drop policy if exists "admin_full_access_metrics"    on public.platform_metrics_snapshots;

-- Defense in depth: with RLS on and no permissive policy these roles already
-- see zero rows, but the blanket grants are what made a single mis-scoped
-- policy this expensive. Take them away too.
revoke all on public.admin_activity_logs,
              public.admin_sessions,
              public.security_threats,
              public.content_moderation_flags,
              public.notification_templates,
              public.notification_automation_rules,
              public.platform_broadcasts,
              public.platform_metrics_snapshots
  from anon, authenticated;

-- content_moderation_flags also carries a correctly scoped policy,
-- `content_moderation_flags_select_admin`: TO authenticated USING
-- (is_app_admin()). The blanket revoke above takes the table grant that policy
-- needs, silently disabling a deliberate access path. Give SELECT back; the
-- over-permissive TO public policy stays dropped.
--
-- (Applied as a second migration, e13_restore_moderation_flags_admin_select.
-- Folded in here so a replay reaches the same end state in one pass — compare
-- these files with the applied list on content, not on name.)
grant select on public.content_moderation_flags to authenticated;

commit;

-- Verified after applying, by querying as each role:
--   all eight tables ............ anon and authenticated both 42501, a hard
--                                 permission denial rather than silent empty
--   content_moderation_flags .... anon 42501; authenticated reaches the
--                                 is_app_admin() policy
--   service role ................ unchanged, still reads all 701 sessions
--
-- Rotate afterwards: the 701 admin_sessions rows were readable for as long as
-- this policy existed, so every session_token in that table must be treated as
-- disclosed. Ending those sessions is an application action, not a migration.
