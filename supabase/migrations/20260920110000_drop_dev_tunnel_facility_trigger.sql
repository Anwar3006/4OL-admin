-- ============================================================================
-- P0-03 · Remove the dev-tunnel webhook trigger on facility_profile
--         (PLAN.md P0-03)
-- ============================================================================
--
-- on_facility_created (AFTER INSERT on facility_profile) ran
-- public.handle_new_facility(), which used pg_net to POST every new facility's
--   whatsapp_number, contact_number, person_contact_number (owner phone),
--   facility_name, email — and gps_address labelled "temp_key" —
-- to https://bx9dscmp-3000.uks1.devtunnels.ms/api/notify with the hard-coded
-- header x-webhook-secret: 4OurLife-WhatsApp.
--
-- That host is a developer's VS Code dev tunnel to localhost:3000, not a
-- 4 Our Life service; no /api/notify route exists in either repo (checked
-- 20 Sept 2026). It never carried the real temporary password, so it could not
-- have delivered login credentials either.
--
-- Replacement: server-side invite delivery (PLAN.md P0-06 —
-- registerProviderAccount() + deliverProviderInvite(): email via SendGrid,
-- WhatsApp via Twilio, SMS fallback via AWS). Nothing in the database sends
-- facility contact data anywhere after this migration.
-- ============================================================================

drop trigger if exists on_facility_created on public.facility_profile;
drop function if exists public.handle_new_facility();
