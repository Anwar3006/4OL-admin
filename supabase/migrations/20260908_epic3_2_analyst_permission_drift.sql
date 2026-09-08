-- Epic 3.2: analyst role permission drift.
--
-- lib/permissions.ts's ROLE_DEFAULTS mirror defines analyst as "every .view
-- permission except admin/security/settings/devops/whatsapp/schematic" (see
-- the comment at ROLE_DEFAULTS.analyst) — 29 keys. The live
-- admin_role_permissions table only granted 25, missing exactly the four
-- below. Verified live: every other one of the 10 roles matches the static
-- mirror exactly; this is the one real drift. Bringing the DB in line with
-- the role's own documented intent, rather than narrowing the code's
-- definition to match an apparent seeding gap.

insert into public.admin_role_permissions (role, permission_key)
values
  ('analyst', 'medenquiry.view'),
  ('analyst', 'engagement.view'),
  ('analyst', 'subscriptions.view'),
  ('analyst', 'fitcoins.view')
on conflict (role, permission_key) do nothing;
