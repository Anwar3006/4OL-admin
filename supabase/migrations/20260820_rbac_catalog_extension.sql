-- =============================================================================
-- RBAC catalog extension (Gap Analysis Parts C/F).
--
-- Adds the two permission keys proposed in GAP_ANALYSIS_MOCKUP_VS_4OURLIFE_ADMIN.md:
--   ibp.delete  — permanent IBP removal (decision C-D2, recommendation adopted)
--   map.export  — Map & Footprint data exports (decision F-D5, recommendation adopted)
--
-- Keeps lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS) in sync.
-- Additive and re-runnable.
-- =============================================================================

insert into public.admin_permissions (key, resource, action, description) values
  ('ibp.delete', 'ibp', 'delete', 'Permanently remove IBP business listings'),
  ('map.export', 'map', 'export', 'Export map, footprint and coverage data')
on conflict (key) do nothing;

-- Grant both keys to admin by default (super_admin bypasses the catalog).
insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'ibp.delete'),
  ('admin', 'map.export')
on conflict do nothing;
