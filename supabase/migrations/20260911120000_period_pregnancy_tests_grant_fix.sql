-- period_pregnancy_tests was created in 20260909_period_phase1_ttc_core.sql
-- with RLS policies but no grant to `authenticated`, unlike its sibling
-- period_ovulation_tests. Result: every call to GET/POST /api/period/me
-- failed with 42501 "permission denied for table period_pregnancy_tests"
-- (a GRANT-level error, never reaching RLS), 500ing the whole Period
-- Tracker payload for every account, every time.
grant select, insert, update, delete on public.period_pregnancy_tests to authenticated;
