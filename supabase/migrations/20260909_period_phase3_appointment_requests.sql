-- ============================================================================
-- Plasence Phase 3 — appointment "request" flow (not real-time booking).
--
-- Real slot-based booking doesn't exist anywhere in this app yet — the one
-- "Appointment Slots" UI element found (the IBP facility-owner dashboard)
-- is a non-functional placeholder with no onPress, no hook, no data. Building
-- real booking from scratch is its own project. This instead reuses the
-- codebase's own request -> admin-fulfills pattern (subscription_upgrade_requests
-- / request_subscription_upgrade) for preconception/fertility appointments:
-- a user optionally links an appointment to a facility_id, which marks it
-- 'requested'; an admin reviews and marks it confirmed/declined
-- (review_appointment_request, features/period/api/data-post.ts). No new RPC
-- needed for the write itself — period_preconception_appointments already has
-- plain owner-write RLS since the Phase 1 migration (period_ttc_profiles /
-- period_ovulation_tests / period_preconception_appointments were loosened
-- from the Sept 3 premium gate back to owner-write), so this is a plain
-- INSERT through features/period/api/me.ts's existing save_preconception_appointment
-- action, extended with an optional facility_id.
-- ============================================================================

alter table public.period_preconception_appointments
  add column if not exists facility_id uuid references public.facility_profile(id) on delete set null;

alter table public.period_preconception_appointments
  add column if not exists request_status text not null default 'self_logged'
    check (request_status in ('self_logged', 'requested', 'confirmed', 'declined'));

create index if not exists idx_period_preconception_appointments_facility
  on public.period_preconception_appointments(facility_id)
  where facility_id is not null;
