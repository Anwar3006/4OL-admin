-- =============================================================================
-- P0-14 admin permission keys (Providers module).
--
-- Seeds the six permission keys the Providers admin module (features/providers/)
-- gates on, listed in PLAN.md's P0-14 bullet:
--   providers.view           — the Providers list + detail read
--   providers.edit           — non-verification, non-suspend profile edits
--   providers.verify         — approve/reject a pending provider, review credentials
--   providers.suspend        — suspend/reinstate a provider (reason required)
--   catalogue.review         — review provider_catalogue_items pending publication
--   provider_types.manage    — edit the provider_types/credential_types/capabilities
--                               lookup tables (the P0-14 Settings editors)
--
-- providers.create already exists (seeded in provider_invite_foundation, P0-06).
-- Keeps lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS) in sync.
-- Additive and re-runnable.
-- =============================================================================

insert into public.admin_permissions (key, resource, action, description) values
  ('providers.view', 'providers', 'view', 'View provider profiles across all kinds (facilities, vendors, practitioners, trainers, ambulance operators)'),
  ('providers.edit', 'providers', 'edit', 'Edit provider profiles'),
  ('providers.verify', 'providers', 'verify', 'Approve or reject a pending provider and review submitted credentials'),
  ('providers.suspend', 'providers', 'suspend', 'Suspend or reinstate a provider'),
  ('catalogue.review', 'catalogue', 'review', 'Review provider catalogue items pending publication'),
  ('provider_types.manage', 'provider_types', 'manage', 'Manage the provider types, credential types and capabilities lookup tables')
on conflict (key) do nothing;

-- Role defaults: granted to admin, mirroring the existing facilities.* grants
-- (the Providers module supersedes the Facilities module for these actions).
-- super_admin bypasses the catalog entirely and needs no row here.
insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'providers.view'),
  ('admin', 'providers.edit'),
  ('admin', 'providers.verify'),
  ('admin', 'providers.suspend'),
  ('admin', 'catalogue.review'),
  ('admin', 'provider_types.manage')
on conflict do nothing;
