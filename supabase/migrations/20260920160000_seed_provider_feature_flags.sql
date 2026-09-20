-- P0-07: seed the 5 provider-portal feature flags, all off.
--
-- feature_flags already exists (20260811_platform_settings.sql) with the
-- schema database.types.ts shows live: id uuid pk, name text unique,
-- description, enabled, rollout_percentage, created_at, updated_at. Pure
-- data, no schema change — `on conflict (name) do nothing` makes this safe
-- to re-run.
--
-- These flags are evaluated in PostHog, not read from this table directly
-- (see lib/posthog-admin.ts) — this row is the super admin's local mirror.
-- The app/api/settings/feature-flags PUT route creates/updates the matching
-- PostHog flag the first time each of these is toggled from Settings, since
-- PostHog has no way to learn about a new flag key on its own.

insert into public.feature_flags (name, description, enabled, rollout_percentage)
values
  ('provider_portal', 'Gates public self-onboarding ("Request access") in the Business app. Invited businesses can always sign in regardless of this flag.', false, 0),
  ('rx_epharmacy', 'Prescription-medicine e-pharmacy (D13) — competes with the Pharmacy Council''s national e-pharmacy platform (NEPP). Off by default; rx credentials are still collected while off.', false, 0),
  ('provider_bookings', 'Booking engine for practitioners/trainers (Phase 2, P2-01).', false, 0),
  ('provider_paid_chat', 'Premium paid chat between patients and providers (D10, P2-03).', false, 0),
  ('order_payments', 'Escrow / order payment movement (D12) — stays off until the boss approves and the Bank of Ghana payment-aggregation licence question is resolved.', false, 0)
on conflict (name) do nothing;
