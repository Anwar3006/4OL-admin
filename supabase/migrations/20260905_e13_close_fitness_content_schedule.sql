-- E1.3, ninth and last of the nine. APPLIED 5 Sept 2026.
--
-- Held back from 20260905_e13_revoke_public_admin_table_access.sql because the
-- Fitness Schedule tab still read this table straight from the browser, and the
-- only thing that made that work was the policy below:
--   admin_full_access_fit_sched  FOR ALL TO public USING (true)
-- `public` in Postgres is every role, `anon` included, so the table was
-- world-readable and world-writable to anyone holding the publishable key.
--
-- Dropping it while the browser still did the reading would have blanked the
-- tab silently — the exact failure mode this epic exists to remove. So the read
-- moved first, to /api/fitness/content-schedule using getAdminClient(), and the
-- new route was verified serving 200 against a real admin session BEFORE this
-- ran.
--
-- Verified after applying, by querying as each role:
--   anon ............. 42501   authenticated ... 42501
--   service_role ..... 0 rows (the table is empty; the app path is unchanged)
--   policies left .... 0
-- and /api/fitness/content-schedule still 200s, /fitness?tab=schedule still
-- 200s, 59/59 smoke tests pass.

drop policy if exists "admin_full_access_fit_sched" on public.fitness_content_schedule;
revoke all on public.fitness_content_schedule from anon, authenticated;
