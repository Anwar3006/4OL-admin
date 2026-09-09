-- New permission: registrar's own scoped FacilityScout view.
insert into admin_permissions (key, resource, action, description)
values ('facilityscout.assignments', 'facilityscout', 'assignments', 'View submissions assigned to me and register the facilities I''ve verified')
on conflict (key) do nothing;

-- Registrar's grant set, replaced wholesale. Zero live registrar accounts
-- exist today, so no real access is revoked from anyone.
delete from admin_role_permissions where role = 'registrar';
insert into admin_role_permissions (role, permission_key) values
  ('registrar', 'dashboard.view'),
  ('registrar', 'facilityscout.assignments');
