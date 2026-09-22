-- Rollback for 20260922090000_p014_provider_admin_permissions.sql

delete from public.admin_role_permissions
where permission_key in (
  'providers.view',
  'providers.edit',
  'providers.verify',
  'providers.suspend',
  'catalogue.review',
  'provider_types.manage'
);

delete from public.admin_permissions
where key in (
  'providers.view',
  'providers.edit',
  'providers.verify',
  'providers.suspend',
  'catalogue.review',
  'provider_types.manage'
);
