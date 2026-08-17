-- =============================================================================
-- RBAC foundation: permission catalog, role defaults, per-user overrides,
-- and the has_4ol_permission() enforcement primitive.
--
-- Design (per the RBAC outline agreed 2026-08-17):
--   * One primary platform role per admin on user_profiles.role
--     (registrar / admin / super_admin plus the new operational roles below).
--   * Permissions are keyed `resource.action`. Role defaults live in
--     admin_role_permissions; per-user additions/removals in
--     admin_user_overrides (removals win over additions and over defaults).
--   * super_admin bypasses every catalog check.
--   * Deny by default: an unknown role or missing row grants nothing.
--
-- Additive and re-runnable: every object uses IF NOT EXISTS / ON CONFLICT.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Canonical platform role vocabulary (application-level source of truth is
--    lib/admin-roles.ts; this table exists so SQL/RLS and the Roles admin UI
--    can enumerate and validate roles without hardcoding strings).
-- -----------------------------------------------------------------------------
create table if not exists public.admin_platform_roles (
  role text primary key,
  label text not null,
  description text,
  is_super boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.admin_platform_roles (role, label, description, is_super, sort_order) values
  ('super_admin',      'Super Admin',       'Full platform control including admin management, security settings and integration keys.', true,  0),
  ('admin',            'Operations Admin',  'Day-to-day operations: approvals, queues, content publishing, broadcasts.',                    false, 1),
  ('registrar',        'Registrar',         'Data entry: facility registration and onboarding intake.',                                     false, 2),
  ('content_manager',  'Content Manager',   'Medical and wellness content: diseases, symptoms, healthy living, FAQ, fitness, period library.', false, 3),
  ('moderator',        'Moderator',         'Reviews, flagged chat messages and the AI moderation queue.',                                  false, 4),
  ('support_agent',    'Support Agent',     'Chats and support tickets; read-only user context.',                                           false, 5),
  ('finance_admin',    'Finance Admin',     'Transactions, refunds, expenses, subscriptions and tax reporting.',                            false, 6),
  ('compliance_officer','Compliance Officer','HCP verification, consent/privacy requests and the delete-account pipeline.',                 false, 7),
  ('analyst',          'Analyst',           'Read-only dashboards, analytics and exports. No mutations.',                                   false, 8)
on conflict (role) do update
  set label = excluded.label,
      description = excluded.description,
      is_super = excluded.is_super,
      sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 2. Permission catalog.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_permissions (
  key text primary key,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (resource, action)
);

insert into public.admin_permissions (key, resource, action, description) values
  -- Platform overview
  ('dashboard.view',           'dashboard',        'view',    'View platform dashboards and analytics'),
  ('dashboard.export',         'dashboard',        'export',  'Export dashboard data'),
  -- Administration
  ('admins.view',              'admins',           'view',    'View admin accounts and session telemetry'),
  ('admins.manage',            'admins',           'manage',  'Invite, suspend, promote or remove admins'),
  ('roles.view',               'roles',            'view',    'View the role/permission matrix'),
  ('roles.edit',               'roles',            'edit',    'Change role permission defaults and per-user overrides'),
  ('users.view',               'users',            'view',    'View user profiles'),
  ('users.edit',               'users',            'edit',    'Edit, suspend or flag users'),
  ('users.export',             'users',            'export',  'Export user data'),
  ('tasks.view',               'tasks',            'view',    'View internal admin tasks'),
  ('tasks.edit',               'tasks',            'edit',    'Create, update or complete admin tasks'),
  -- Health services
  ('facilities.view',          'facilities',       'view',    'View facility profiles'),
  ('facilities.create',        'facilities',       'create',  'Register new facilities'),
  ('facilities.edit',          'facilities',       'edit',    'Edit facility profiles'),
  ('facilities.delete',        'facilities',       'delete',  'Delete facility profiles'),
  ('facilities.approve',       'facilities',       'approve', 'Approve or reject pending facilities'),
  ('reviews.view',             'reviews',          'view',    'View facility reviews and ratings'),
  ('reviews.moderate',         'reviews',          'moderate','Publish, reject or moderate reviews'),
  ('diseases.view',            'diseases',         'view',    'View diseases and conditions content'),
  ('diseases.create',          'diseases',         'create',  'Add diseases and conditions'),
  ('diseases.edit',            'diseases',         'edit',    'Edit diseases and conditions'),
  ('diseases.delete',          'diseases',         'delete',  'Delete diseases and conditions'),
  ('symptoms.view',            'symptoms',         'view',    'View symptoms content'),
  ('symptoms.create',          'symptoms',         'create',  'Add symptoms'),
  ('symptoms.edit',            'symptoms',         'edit',    'Edit symptoms'),
  ('symptoms.delete',          'symptoms',         'delete',  'Delete symptoms'),
  ('anatomy.view',             'anatomy',          'view',    'View anatomy content'),
  ('anatomy.edit',             'anatomy',          'edit',    'Edit anatomy content'),
  ('healthyliving.view',       'healthyliving',    'view',    'View healthy living articles'),
  ('healthyliving.create',     'healthyliving',    'create',  'Add healthy living articles'),
  ('healthyliving.edit',       'healthyliving',    'edit',    'Edit healthy living articles'),
  ('healthyliving.delete',     'healthyliving',    'delete',  'Delete healthy living articles'),
  ('faq.view',                 'faq',              'view',    'View FAQs'),
  ('faq.create',               'faq',              'create',  'Add FAQs'),
  ('faq.edit',                 'faq',              'edit',    'Edit FAQs'),
  ('faq.delete',               'faq',              'delete',  'Delete FAQs'),
  ('fitness.view',             'fitness',          'view',    'View fitness library'),
  ('fitness.create',           'fitness',          'create',  'Add exercises, plans and challenges'),
  ('fitness.edit',             'fitness',          'edit',    'Edit fitness content'),
  ('fitness.delete',           'fitness',          'delete',  'Delete fitness content'),
  ('period.view',              'period',           'view',    'View privacy-minimized Period Tracker records'),
  ('period.edit',              'period',           'edit',    'Correct Period Tracker records'),
  ('period.review_notes',      'period',           'review_notes', 'Review explicitly flagged period notes'),
  ('period.content',           'period',           'content', 'Manage Period Library content'),
  ('medication.view',          'medication',       'view',    'View medication reminder data'),
  ('medication.edit',          'medication',       'edit',    'Manage medication database entries'),
  ('hcp.view',                 'hcp',              'view',    'View healthcare professional records'),
  ('hcp.verify',               'hcp',              'verify',  'Approve or reject HCP verifications'),
  ('jobs.view',                'jobs',             'view',    'View job listings and applications'),
  ('jobs.manage',              'jobs',             'manage',  'Post, edit or remove job listings'),
  ('ibp.view',                 'ibp',              'view',    'View IBP business listings'),
  ('ibp.edit',                 'ibp',              'edit',    'Manage IBP business listings'),
  ('bedtracker.view',          'bedtracker',       'view',    'View BedTracker data'),
  ('bedtracker.manage',        'bedtracker',       'manage',  'Manage beds, wards and dispatches'),
  ('facilityscout.view',       'facilityscout',    'view',    'View FacilityScout submissions'),
  ('facilityscout.review',     'facilityscout',    'review',  'Review submissions and release rewards'),
  -- Engagement
  ('chats.view',               'chats',            'view',    'View conversations and support tickets'),
  ('chats.reply',              'chats',            'reply',   'Reply to conversations and tickets'),
  ('chats.moderate',           'chats',            'moderate','Moderate flagged messages and groups'),
  ('marketing.view',           'marketing',        'view',    'View campaigns, discounts and subscriptions'),
  ('marketing.create',         'marketing',        'create',  'Create campaigns and discounts'),
  ('marketing.edit',           'marketing',        'edit',    'Edit campaigns and discounts'),
  ('marketing.delete',         'marketing',        'delete',  'Delete campaigns and discounts'),
  ('notifications.view',       'notifications',    'view',    'View notification campaigns and templates'),
  ('notifications.create',     'notifications',    'create',  'Create and schedule notification campaigns'),
  ('notifications.edit',       'notifications',    'edit',    'Edit notification campaigns'),
  ('notifications.delete',     'notifications',    'delete',  'Delete notification campaigns'),
  -- Finance
  ('transactions.view',        'transactions',     'view',    'View transactions and revenue analytics'),
  ('transactions.manage',      'transactions',     'manage',  'Process refunds and manage charges'),
  ('transactions.export',      'transactions',     'export',  'Export financial reports'),
  -- AI
  ('ai.view',                  'ai',               'view',    'View AI models, moderation queues and usage analytics'),
  ('ai.manage',                'ai',               'manage',  'Configure AI models and moderation settings'),
  -- Privacy & compliance
  ('deleteaccount.view',       'deleteaccount',    'view',    'View delete-account requests'),
  ('deleteaccount.approve',    'deleteaccount',    'approve', 'Approve or reject delete-account requests'),
  ('security.view',            'security',         'view',    'View security center and audit logs'),
  ('security.settings',        'security',         'settings','Change platform security settings'),
  ('integrations.keys',        'integrations',     'keys',    'Manage external integration credentials')
on conflict (key) do update
  set resource = excluded.resource,
      action = excluded.action,
      description = excluded.description;

-- -----------------------------------------------------------------------------
-- 3. Role defaults. super_admin intentionally has NO rows: it bypasses the
--    catalog entirely (see has_4ol_permission below).
-- -----------------------------------------------------------------------------
create table if not exists public.admin_role_permissions (
  role text not null references public.admin_platform_roles(role) on delete cascade,
  permission_key text not null references public.admin_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_key)
);

insert into public.admin_role_permissions (role, permission_key)
select r.role, p.key
from (values
  ('admin'),('registrar'),('content_manager'),('moderator'),('support_agent'),
  ('finance_admin'),('compliance_officer'),('analyst')
) as r(role)
cross join public.admin_permissions p
where r.role = 'admin' and p.key in (
  'dashboard.view','dashboard.export',
  'admins.view','users.view','users.edit','users.export','tasks.view','tasks.edit',
  'facilities.view','facilities.create','facilities.edit','facilities.delete','facilities.approve',
  'reviews.view','reviews.moderate',
  'diseases.view','diseases.create','diseases.edit','diseases.delete',
  'symptoms.view','symptoms.create','symptoms.edit','symptoms.delete',
  'anatomy.view','anatomy.edit',
  'healthyliving.view','healthyliving.create','healthyliving.edit','healthyliving.delete',
  'faq.view','faq.create','faq.edit','faq.delete',
  'fitness.view','fitness.create','fitness.edit','fitness.delete',
  'period.view','period.edit','period.review_notes','period.content',
  'medication.view','medication.edit',
  'hcp.view','hcp.verify',
  'jobs.view','jobs.manage',
  'ibp.view','ibp.edit',
  'ai.view','ai.manage',
  'bedtracker.view','bedtracker.manage',
  'facilityscout.view','facilityscout.review',
  'chats.view','chats.reply','chats.moderate',
  'marketing.view','marketing.create','marketing.edit','marketing.delete',
  'notifications.view','notifications.create','notifications.edit','notifications.delete',
  'transactions.view',
  'deleteaccount.view',
  'security.view'
)
or r.role = 'registrar' and p.key in (
  'dashboard.view',
  'users.view',
  'facilities.view','facilities.create','facilities.edit',
  'bedtracker.view','facilityscout.view','facilityscout.review',
  'ibp.view',
  'tasks.view'
)
or r.role = 'content_manager' and p.key in (
  'dashboard.view',
  'diseases.view','diseases.create','diseases.edit','diseases.delete',
  'symptoms.view','symptoms.create','symptoms.edit','symptoms.delete',
  'anatomy.view','anatomy.edit',
  'healthyliving.view','healthyliving.create','healthyliving.edit','healthyliving.delete',
  'faq.view','faq.create','faq.edit','faq.delete',
  'fitness.view','fitness.create','fitness.edit','fitness.delete',
  'period.view','period.content',
  'medication.view'
)
or r.role = 'moderator' and p.key in (
  'dashboard.view',
  'users.view',
  'reviews.view','reviews.moderate',
  'chats.view','chats.moderate',
  'ai.view',
  'period.view','period.review_notes'
)
or r.role = 'support_agent' and p.key in (
  'dashboard.view',
  'users.view',
  'chats.view','chats.reply',
  'faq.view'
)
or r.role = 'finance_admin' and p.key in (
  'dashboard.view','dashboard.export',
  'users.view',
  'transactions.view','transactions.manage','transactions.export',
  'marketing.view'
)
or r.role = 'compliance_officer' and p.key in (
  'dashboard.view',
  'users.view',
  'hcp.view','hcp.verify',
  'deleteaccount.view','deleteaccount.approve',
  'period.view',
  'security.view'
)
or r.role = 'analyst' and p.key like '%.view' and p.key not in (
  'admins.view','roles.view','security.view'
)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 4. Per-user overrides. effect = 'grant' adds a permission on top of the
--    role defaults; effect = 'revoke' removes it. Revokes always win.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_user_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.admin_permissions(key) on delete cascade,
  effect text not null check (effect in ('grant','revoke')),
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- -----------------------------------------------------------------------------
-- 5. Enforcement primitive. Mirrors is_app_admin() semantics but with a
--    permission-catalog lookup. super_admin short-circuits to true.
-- -----------------------------------------------------------------------------
create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role in (select role from public.admin_platform_roles)
      and coalesce(up.status, 'active') not in ('suspended','banned')
  );
$$;

create or replace function public.has_4ol_permission(p_user_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role = 'super_admin'
      and coalesce(up.status, 'active') not in ('suspended','banned')
  )
  or (
    exists (
      select 1
      from public.user_profiles up
      where up.user_id = p_user_id
        and up.role <> 'super_admin'
        and up.role in (select role from public.admin_platform_roles)
        and coalesce(up.status, 'active') not in ('suspended','banned')
    )
    and exists (
      select 1
      from public.admin_role_permissions rp
      join public.user_profiles up on up.role = rp.role
      where up.user_id = p_user_id
        and rp.permission_key = p_key
    )
    and not exists (
      select 1
      from public.admin_user_overrides ov
      where ov.user_id = p_user_id
        and ov.permission_key = p_key
        and ov.effect = 'revoke'
    )
  )
  or (
    exists (
      select 1
      from public.user_profiles up
      where up.user_id = p_user_id
        and up.role <> 'super_admin'
        and up.role in (select role from public.admin_platform_roles)
        and coalesce(up.status, 'active') not in ('suspended','banned')
    )
    and exists (
      select 1
      from public.admin_user_overrides ov
      where ov.user_id = p_user_id
        and ov.permission_key = p_key
        and ov.effect = 'grant'
    )
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public;
revoke all on function public.has_4ol_permission(uuid, text) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.has_4ol_permission(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Effective-permissions view for the admin UI and RPCs.
-- -----------------------------------------------------------------------------
create or replace function public.get_effective_admin_permissions(p_user_id uuid)
returns table (key text, resource text, action text)
language sql
stable
security definer
set search_path = public
as $$
  select ap.key, ap.resource, ap.action
  from public.admin_permissions ap
  where public.has_4ol_permission(p_user_id, ap.key)
  order by ap.resource, ap.action;
$$;

revoke all on function public.get_effective_admin_permissions(uuid) from public;
grant execute on function public.get_effective_admin_permissions(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Lock the RBAC tables down: only service-role (server) access. The admin
--    UI reads/writes them exclusively through /api/admin/* route handlers.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'admin_platform_roles','admin_permissions','admin_role_permissions','admin_user_overrides'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
  end loop;
end $$;
