-- =============================================================================
-- AF-01 / AF-02 — RBAC permission catalog additions (Family Circle + Feedback)
-- =============================================================================
-- Additive extension of 20260817_rbac_permission_catalog.sql. Registers the new
-- resource.action permission keys and seeds sensible role defaults. super_admin
-- still bypasses the catalog entirely (no rows needed).
--
-- Re-runnable: ON CONFLICT DO NOTHING / DO UPDATE.
-- =============================================================================

-- 1. New permission keys -------------------------------------------------------
INSERT INTO public.admin_permissions (key, resource, action, description) VALUES
  -- AF-01 Family Circle
  ('family.view',     'family', 'view',   'View family care-circle links and consent status'),
  ('family.manage',   'family', 'manage', 'Override dependent limits, pause or revoke links'),
  ('family.export',   'family', 'export', 'Export family-circle consent audit data'),
  -- AF-02 Feedback Board
  ('feedback.view',     'feedback', 'view',     'View the feedback board and moderation queue'),
  ('feedback.moderate', 'feedback', 'moderate', 'Approve, hide or reset flags on feedback posts'),
  ('feedback.respond',  'feedback', 'respond',  'Post staff replies and move status through the pipeline'),
  ('feedback.manage',   'feedback', 'manage',   'Delete posts, convert reviews, override moderation'),
  ('feedback.export',   'feedback', 'export',   'Export feedback insights (CSV)')
ON CONFLICT (key) DO UPDATE
  SET resource = EXCLUDED.resource,
      action = EXCLUDED.action,
      description = EXCLUDED.description;

-- 2. Role defaults -------------------------------------------------------------
-- admin: full control of both features.
INSERT INTO public.admin_role_permissions (role, permission_key)
SELECT 'admin', p.key FROM public.admin_permissions p
WHERE p.key IN ('family.view','family.manage','family.export',
                'feedback.view','feedback.moderate','feedback.respond','feedback.manage','feedback.export')
ON CONFLICT DO NOTHING;

-- support_agent: read + respond on feedback, read-only family link status.
INSERT INTO public.admin_role_permissions (role, permission_key)
SELECT 'support_agent', p.key FROM public.admin_permissions p
WHERE p.key IN ('family.view','feedback.view','feedback.respond')
ON CONFLICT DO NOTHING;

-- moderator: feedback moderation queue.
INSERT INTO public.admin_role_permissions (role, permission_key)
SELECT 'moderator', p.key FROM public.admin_permissions p
WHERE p.key IN ('feedback.view','feedback.moderate')
ON CONFLICT DO NOTHING;

-- compliance_officer: family consent audit read (trust/compliance oversight).
INSERT INTO public.admin_role_permissions (role, permission_key)
SELECT 'compliance_officer', p.key FROM public.admin_permissions p
WHERE p.key IN ('family.view','family.export')
ON CONFLICT DO NOTHING;

-- analyst: read-only slices + export.
INSERT INTO public.admin_role_permissions (role, permission_key)
SELECT 'analyst', p.key FROM public.admin_permissions p
WHERE p.key IN ('family.view','feedback.view','feedback.export')
ON CONFLICT DO NOTHING;
