-- Medication name as free text for now: the mobile app lets users type
-- whatever they took when they flip "medication logged" on. Once we have
-- our own drugstore catalog, unresolved names get checked against openFDA
-- and backfilled into a proper drug table/id -- this column stays as the
-- raw user-entered string in the meantime.
alter table public.period_daily_logs add column if not exists medication_name text check (char_length(medication_name) <= 120);
