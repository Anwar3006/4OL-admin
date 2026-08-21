-- =============================================================================
-- RBAC catalog extension 3 (Gap Analysis Parts Y/Z).
--
-- Seeds the permission keys added to lib/permissions.ts in this workstream:
--   schematic.view       — platform schematic + service health map (Y-D1; super_admin only)
--   deleteaccount.export — CSV export of the delete-account request log (Z-D5; admin + compliance_officer)
--
-- Keys intentionally NOT granted to any role default are super_admin-only
-- (super_admin bypasses the catalog entirely at runtime).
-- Keeps lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS) in sync.
-- Additive and re-runnable.
-- =============================================================================

insert into public.admin_permissions (key, resource, action, description) values
  ('schematic.view', 'schematic', 'view', 'View the platform schematic and service health map'),
  ('deleteaccount.export', 'deleteaccount', 'export', 'Export the delete-account request log')
on conflict (key) do nothing;

-- Role defaults (super_admin bypasses the catalog; schematic.view is
-- deliberately super_admin-only).
insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'deleteaccount.export'),
  ('compliance_officer', 'deleteaccount.export')
on conflict do nothing;
