-- =============================================================================
-- ROLLBACK for 20260926120000_af_rbac_permissions.sql
-- =============================================================================
-- Removes the AF-01/AF-02 permission keys and their role grants. Cascading FK
-- on admin_role_permissions.permission_key cleans up the role mappings, but we
-- delete them explicitly first for clarity. Re-runnable.
-- =============================================================================

DELETE FROM public.admin_role_permissions
WHERE permission_key IN (
  'family.view','family.manage','family.export',
  'feedback.view','feedback.moderate','feedback.respond','feedback.manage','feedback.export'
);

DELETE FROM public.admin_user_overrides
WHERE permission_key IN (
  'family.view','family.manage','family.export',
  'feedback.view','feedback.moderate','feedback.respond','feedback.manage','feedback.export'
);

DELETE FROM public.admin_permissions
WHERE key IN (
  'family.view','family.manage','family.export',
  'feedback.view','feedback.moderate','feedback.respond','feedback.manage','feedback.export'
);
