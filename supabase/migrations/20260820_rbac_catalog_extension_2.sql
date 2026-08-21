-- =============================================================================
-- RBAC catalog extension 2 (Gap Analysis Parts H/I/J/P/T/U).
--
-- Seeds the permission keys added to lib/permissions.ts in this workstream:
--   facilities.feature  — top-rated/featured placement control (H-D5; super_admin only)
--   diseases.feature    — carousel featuring of conditions (I; admin + content_manager)
--   hcp.create          — HCP onboarding (J-D2; admin)
--   whatsapp.view       — view WhatsApp community groups/broadcasts (T; admin)
--   whatsapp.broadcast  — queue WhatsApp broadcasts (T; super_admin only)
--   settings.view       — read platform settings (P; admin)
--   settings.manage     — edit general settings + feature flags (P; admin)
--   settings.security   — maintenance mode, API keys, security settings (P; super_admin only)
--   settings.billing    — billing/plans/GRA compliance settings (P; super_admin only)
--   devops.view         — infra/CI-CD/rate-limit/caching telemetry (U-D1; super_admin only)
--   notifications.export — CSV export of the notification log (R-D7; admin)
--
-- Keys intentionally NOT granted to any role default are super_admin-only
-- (super_admin bypasses the catalog entirely at runtime).
-- Keeps lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS) in sync.
-- Additive and re-runnable.
-- =============================================================================

insert into public.admin_permissions (key, resource, action, description) values
  ('facilities.feature', 'facilities', 'feature', 'Set top-rated rankings and featured placements'),
  ('diseases.feature', 'diseases', 'feature', 'Feature conditions on the carousel'),
  ('hcp.create', 'hcp', 'create', 'Onboard new healthcare professionals'),
  ('whatsapp.view', 'whatsapp', 'view', 'View WhatsApp community groups and broadcasts'),
  ('whatsapp.broadcast', 'whatsapp', 'broadcast', 'Queue WhatsApp broadcasts'),
  ('settings.view', 'settings', 'view', 'View platform settings'),
  ('settings.manage', 'settings', 'manage', 'Edit general platform settings and feature flags'),
  ('settings.security', 'settings', 'security', 'Change security settings, maintenance mode and API keys'),
  ('settings.billing', 'settings', 'billing', 'Manage billing, plans and GRA tax settings'),
  ('devops.view', 'devops', 'view', 'View infrastructure, CI/CD, rate-limiting and caching telemetry'),
  ('notifications.export', 'notifications', 'export', 'Export the notification log')
on conflict (key) do nothing;

-- Role defaults (super_admin bypasses the catalog; settings.security,
-- settings.billing, whatsapp.broadcast, facilities.feature and devops.view
-- are deliberately super_admin-only).
insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'diseases.feature'),
  ('content_manager', 'diseases.feature'),
  ('admin', 'hcp.create'),
  ('admin', 'whatsapp.view'),
  ('admin', 'settings.view'),
  ('admin', 'settings.manage'),
  ('admin', 'notifications.export'),
  ('ai_manager', 'dashboard.view'),
  ('ai_manager', 'ai.view'),
  ('ai_manager', 'ai.manage')
on conflict do nothing;

-- O12: AI Manager platform role (mockup role table L10880) — scoped to
-- the AI Hub only. user_profiles.role is free text, so adding the role
-- vocabulary row is all that's required server-side.
insert into public.admin_platform_roles (role, label, description, is_super, sort_order) values
  ('ai_manager', 'AI Manager', 'AI Hub only: models, moderation queue, recommendations and AI analytics.', false, 9)
on conflict (role) do nothing;
