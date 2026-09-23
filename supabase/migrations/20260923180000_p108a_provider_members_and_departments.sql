-- P1-08a · Staff accounts and departments: the membership model
--
-- Today `providers.owner_id` is a single uuid and it is the ONLY thing in this
-- database that expresses "who may act for this business". It is the
-- authorisation check in 9 functions and 19 RLS policies. That forces one
-- shared login per business (D14's shared counter phones) and makes every
-- action unattributable — `provider_activity_log` has had an `actor_id`
-- column since P0-12 and has never held a row, because there has never been
-- a person to put in it.
--
-- This migration adds the model. It changes NO existing behaviour: nothing
-- reads these tables yet. The swap from `owner_id = auth.uid()` to
-- `is_provider_member(...)` is P1-08b, deliberately separate so it can be
-- verified on its own while only owners exist.
--
-- A note on `owner_id`: it is NOT being deprecated. It stays as the legal and
-- billing owner, P0-02's RLS still reads it, and `is_provider_member` honours
-- it directly — so every existing owner keeps working with no backfill and no
-- cutover. Membership is purely additive on top of it.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Departments
--
-- A department is a sub-unit of ONE provider, not a provider of its own: one
-- directory listing, one bed total, one subscription.
--
-- A DEPARTMENT IS NOT A BRANCH. A hospital's Maternity unit is a department.
-- A second physical site is a separate `providers` row, which is what the
-- Business app's branch switcher already handles. Modelling branches as
-- departments would merge two businesses into one listing; modelling
-- departments as branches would split one hospital across the map.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.provider_departments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  -- Free text rather than a lookup table: departments vary far more between
  -- hospitals than provider_types do between businesses, and an admin-managed
  -- enum would be a support ticket every time someone opens a new unit.
  department_type text,
  -- The hospital's own code for the unit, e.g. "MAT-01". Theirs, not ours.
  code text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  contact_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_departments_name_unique unique (provider_id, name)
);

create index if not exists provider_departments_provider_idx
  on public.provider_departments (provider_id)
  where status = 'active';

comment on table public.provider_departments is
  'Sub-units of one provider (hospital wards/units, shop counters). NOT branches — a second physical site is its own providers row.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Members — the table this whole phase turns on
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.provider_members (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- NULL means whole-business scope (owner, admin). Non-null scopes the
  -- member to one department: a maternity nurse must not be able to update
  -- ICU beds. ON DELETE SET NULL rather than CASCADE — deleting a department
  -- must not silently delete the people who worked in it.
  department_id uuid references public.provider_departments(id) on delete set null,
  role text not null
    check (role in ('owner', 'admin', 'department_manager', 'staff')),
  -- 'suspended' is what you use when someone leaves. Deleting the row would
  -- orphan their audit trail, which is the thing this phase exists to create.
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended')),
  job_title text,
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_members_unique unique (provider_id, user_id)
);

-- The hot path: `is_provider_member` runs on every gated call.
create index if not exists provider_members_lookup_idx
  on public.provider_members (user_id, provider_id)
  where status = 'active';

create index if not exists provider_members_provider_idx
  on public.provider_members (provider_id);

comment on table public.provider_members is
  'Who may act for a provider, and in what scope. department_id NULL = whole business. Replaces providers.owner_id as the authorisation check (P1-08b); owner_id remains the legal/billing owner.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Permissions
--
-- Deliberately the same shape as `admin_permissions` / `admin_role_permissions`
-- (P0-14 extended those), down to the `resource.action` key. A second,
-- differently-shaped permission system in the same database would be a
-- standing source of bugs for whoever has to reason about both.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.provider_permissions (
  key text primary key,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_role_permissions (
  role text not null
    check (role in ('owner', 'admin', 'department_manager', 'staff')),
  permission_key text not null references public.provider_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_key)
);

insert into public.provider_permissions (key, resource, action, description) values
  ('orders.view',      'orders',    'view',   'See the orders board'),
  ('orders.fulfil',    'orders',    'fulfil', 'Mark ready, verify pickup codes, mark delivered'),
  ('requests.quote',   'requests',  'quote',  'Answer patient enquiries with a price'),
  ('catalogue.manage', 'catalogue', 'manage', 'Add, edit and publish catalogue items'),
  ('beds.update',      'beds',      'update', 'Update ward bed counts'),
  ('bookings.manage',  'bookings',  'manage', 'Accept, decline and reschedule bookings'),
  ('profile.edit',     'profile',   'edit',   'Edit the public business profile'),
  ('settings.manage',  'settings',  'manage', 'Delivery settings, hours and other business settings'),
  ('staff.manage',     'staff',     'manage', 'Invite staff, change their role, suspend them'),
  ('payouts.manage',   'payouts',   'manage', 'Move money out of the business account')
on conflict (key) do nothing;

-- Role grants.
--
-- `payouts.manage` is OWNER-ONLY, deliberately. It is the one permission that
-- can move money off the platform, and the threat that started this work was
-- a co-worker on a shared counter phone. It stays owner-only until there is a
-- concrete reason it cannot be. (D12 is still on hold; no payout screen
-- exists yet — see P0-16's `SensitiveAction`, which already declares the gate.)
insert into public.provider_role_permissions (role, permission_key)
select 'owner', key from public.provider_permissions
on conflict do nothing;

insert into public.provider_role_permissions (role, permission_key)
select 'admin', key from public.provider_permissions
where key <> 'payouts.manage'
on conflict do nothing;

-- A department manager runs their unit: everything operational inside it,
-- plus the ability to staff it. Not settings (business-wide) and not payouts.
insert into public.provider_role_permissions (role, permission_key) values
  ('department_manager', 'orders.view'),
  ('department_manager', 'orders.fulfil'),
  ('department_manager', 'requests.quote'),
  ('department_manager', 'catalogue.manage'),
  ('department_manager', 'beds.update'),
  ('department_manager', 'bookings.manage'),
  ('department_manager', 'staff.manage')
on conflict do nothing;

-- Staff do the day's work and nothing that changes the business.
insert into public.provider_role_permissions (role, permission_key) values
  ('staff', 'orders.view'),
  ('staff', 'orders.fulfil'),
  ('staff', 'requests.quote'),
  ('staff', 'beds.update'),
  ('staff', 'bookings.manage')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. The helper that P1-08b will swap in everywhere
--
-- One helper rather than 28 hand-edited call sites. Same shape as the
-- existing `is_app_admin()` / `has_4ol_permission()`.
-- ─────────────────────────────────────────────────────────────────────────

/**
 * May the caller act for this provider?
 *
 * Three arguments, each narrowing:
 *   p_provider_id   the business
 *   p_permission    a `provider_permissions.key`, or NULL for "any member"
 *   p_department_id the department the action touches, or NULL for
 *                   business-wide actions
 *
 * The `owner_id` branch is what makes the P1-08b swap safe: it is checked
 * first and independently, so every provider that exists today keeps working
 * with no `provider_members` row at all. Membership is additive.
 *
 * ── Department scoping, and the trap in it ─────────────────────────────────
 *
 * The department clause bites ONLY when `p_department_id` is passed. A
 * department-scoped member then has to be in that department; an unscoped
 * member (NULL `department_id` — owner, admin) passes either way.
 *
 * It deliberately does NOT bite when `p_department_id` is null, and the first
 * draft of this function had it the other way round. That version was wrong
 * in a way worth recording: a maternity nurse failed the bare
 * `is_provider_member(provider_id)` check, because her `department_id` was
 * not null and there was no department to match it against. That single
 * predicate would have hidden her own provider from
 * `get_my_provider_context()` and locked her out of every RLS read below —
 * she would have signed in successfully and seen no business at all.
 *
 * The consequence of the fix: **a caller that cares which department an
 * action touches MUST pass `p_department_id`.** Omitting it asks "may this
 * person do X anywhere in the business", which a scoped member can answer
 * yes to. Every department-touching RPC (bed updates first) has to pass it.
 */
create or replace function public.is_provider_member(
  p_provider_id uuid,
  p_permission text default null,
  p_department_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    -- The legal owner, always, regardless of membership rows.
    exists (
      select 1 from public.providers p
      where p.id = p_provider_id
        and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.provider_members m
      where m.provider_id = p_provider_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and (
          p_permission is null
          or exists (
            select 1 from public.provider_role_permissions rp
            where rp.role = m.role
              and rp.permission_key = p_permission
          )
        )
        and (
          -- Only applies when the caller says which department is involved.
          p_department_id is null
          -- Unscoped members (owner, admin) act anywhere in the business.
          or m.department_id is null
          or m.department_id = p_department_id
        )
    );
$function$;

revoke execute on function public.is_provider_member(uuid, text, uuid) from public;
grant execute on function public.is_provider_member(uuid, text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Backfill: every existing owner becomes an explicit member
--
-- Belt and braces — `is_provider_member` already covers them through the
-- `owner_id` branch above. The rows matter so that the Staff screen shows the
-- owner in the list rather than an empty table, and so `provider_activity_log`
-- has a member row to attribute the owner's own actions to.
-- ─────────────────────────────────────────────────────────────────────────

insert into public.provider_members
  (provider_id, user_id, role, status, accepted_at)
select p.id, p.owner_id, 'owner', 'active', coalesce(p.approved_at, p.created_at, now())
from public.providers p
where p.owner_id is not null
on conflict (provider_id, user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. RLS
--
-- Reads follow the pattern the other provider_* tables use (owner-or-admin),
-- extended to members. Writes go through RPCs in P1-08d, not through
-- policies: an INSERT policy on `provider_members` would let a member write
-- their own role, which is a privilege-escalation hole no amount of care in
-- the app would close. Same reasoning as `provider_inbox` having no INSERT
-- policy at all (P0-15).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.provider_departments enable row level security;
alter table public.provider_members enable row level security;
alter table public.provider_permissions enable row level security;
alter table public.provider_role_permissions enable row level security;

drop policy if exists "provider_departments member and admin read" on public.provider_departments;
create policy "provider_departments member and admin read"
  on public.provider_departments for select
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

drop policy if exists "provider_members member and admin read" on public.provider_members;
create policy "provider_members member and admin read"
  on public.provider_members for select
  using (
    (select public.is_app_admin())
    or public.is_provider_member(provider_id)
  );

-- The permission catalogue is not secret and the app needs it to decide which
-- tabs to render. Readable by any signed-in user, writable by nobody but
-- admins (no policy = no access; these are seeded by migration).
drop policy if exists "provider_permissions readable" on public.provider_permissions;
create policy "provider_permissions readable"
  on public.provider_permissions for select to authenticated using (true);

drop policy if exists "provider_role_permissions readable" on public.provider_role_permissions;
create policy "provider_role_permissions readable"
  on public.provider_role_permissions for select to authenticated using (true);

grant select on public.provider_departments to authenticated;
grant select on public.provider_members to authenticated;
grant select on public.provider_permissions to authenticated;
grant select on public.provider_role_permissions to authenticated;

-- `updated_at` maintenance, matching the existing tables' trigger.
drop trigger if exists trg_provider_departments_updated_at on public.provider_departments;
create trigger trg_provider_departments_updated_at
  before update on public.provider_departments
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_provider_members_updated_at on public.provider_members;
create trigger trg_provider_members_updated_at
  before update on public.provider_members
  for each row execute function public.update_updated_at_column();
