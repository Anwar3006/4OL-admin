-- Legacy mobile period-tracker table, superseded by the period_* schema
-- (Plasence). Confirmed 0 rows and confirmed no code anywhere reads or
-- writes it: the mobile screens that used it (src/screens/periodsTrackerScreens/*,
-- src/services/tracker_logs/) were unregistered dead code and have been
-- deleted; the web-repo /api/cron/tracker and /api/cron/ovulation routes
-- referenced in vercel.json's crons never existed as actual route files.
drop table if exists public.tracker_logs cascade;
