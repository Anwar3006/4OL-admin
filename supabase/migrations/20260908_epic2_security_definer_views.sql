-- Epic 2.1 (TASKS.md): fix the four SECURITY DEFINER views flagged by the
-- security advisor (ERROR level).

-- healthy_living_info_view: unused (verified -- no call sites in admin or
-- mobile beyond generated FK metadata; both repos read healthy_living_info
-- directly). Fully close it off.
alter view public.healthy_living_info_view set (security_invoker = true);
revoke all on public.healthy_living_info_view from anon, authenticated;

-- notification_log_export: unused, and currently exposes every user's
-- notification content with no per-user filter. Fully close it off.
alter view public.notification_log_export set (security_invoker = true);
revoke all on public.notification_log_export from anon, authenticated;

-- fitness leaderboards: live, mobile-contracted (use-fitness-challenges.ts).
-- Cannot flip security_invoker without new RLS design + a coordinated mobile
-- release (would silently drop every other participant's row today, since
-- fitness_challenge_entries and user_profiles RLS is own-row-or-admin).
-- Tighten grants to match the product's existing access model instead:
-- fitness_challenge_participants/teams are already USING (true) SELECT for
-- authenticated, so anon has no legitimate reason to read the leaderboard,
-- and neither view is updatable (joins + aggregates), so the write grants
-- were always inert. Tracked follow-up: replace with a SECURITY DEFINER
-- function (fixed search_path) once mobile can move from .from() to .rpc().
revoke all on public.fitness_challenge_leaderboard from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.fitness_challenge_leaderboard from authenticated;
revoke all on public.fitness_challenge_team_leaderboard from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.fitness_challenge_team_leaderboard from authenticated;
