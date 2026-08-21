-- ═══════════════════════════════════════════════════════════════════════════
-- Users & IBP extension (Gap Analysis Part C, phases 1)
--
-- Additive only:
--   1. user_profiles: public_id (4OL-XXXXXX), region, nhis_number
--   2. ibp: branches, founded_year, tin_number, registration_docs,
--      suspended_reason / suspended_by / suspended_at
--   3. ibp_products — product/service approval workflow
--   4. ibp_activity_log — per-IBP admin audit trail
--   5. KPI RPCs: get_user_kpi_stats(), get_ibp_kpi_stats()
--
-- Decisions (gap doc C.8): C-D2 dedicated ibp.delete key (catalog),
-- C-D3 backfill public_id, C-D4 NHIS presence count.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. User profile extension ──────────────────────────────────────────────

alter table public.user_profiles
  add column if not exists public_id text,
  add column if not exists region text,
  add column if not exists nhis_number text; -- store encrypted app-side

create sequence if not exists public.user_public_id_seq;

-- Backfill public ids for existing profiles (4OL-000001 …, deterministic).
with numbered as (
  select user_id,
         (select coalesce(max((nullif(regexp_replace(public_id, '\D', '', 'g'), '')::int), 0)
          from public.user_profiles)) + row_number() over (order by created_at, user_id) as rn
  from public.user_profiles
  where public_id is null
)
update public.user_profiles up
set public_id = '4OL-' || lpad(numbered.rn::text, 6, '0')
from numbered
where up.user_id = numbered.user_id;

-- Unique constraint only after backfill so it cannot fail mid-migration.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_public_id_key'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_public_id_key unique (public_id);
  end if;
end $$;

-- Auto-assign a public id to new profiles.
create or replace function public.assign_user_public_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.public_id is null then
    new.public_id := '4OL-' || lpad(nextval('public.user_public_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_user_public_id on public.user_profiles;
create trigger trg_assign_user_public_id
  before insert on public.user_profiles
  for each row execute function public.assign_user_public_id();

-- ── 2. IBP extension ───────────────────────────────────────────────────────

alter table public.ibp
  add column if not exists branches int default 1,
  add column if not exists founded_year int,
  add column if not exists tin_number text,
  add column if not exists registration_docs jsonb default '[]',
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid,
  add column if not exists suspended_at timestamptz;

-- ── 3. IBP products & services ─────────────────────────────────────────────

create table if not exists public.ibp_products (
  id uuid primary key default gen_random_uuid(),
  ibp_id uuid not null references public.ibp(id) on delete cascade,
  name text not null,
  category text,
  image_url text,
  status text not null default 'pending'
    check (status in ('pending','published','rejected','flagged')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists ibp_products_ibp_idx on public.ibp_products (ibp_id);
create index if not exists ibp_products_status_idx on public.ibp_products (status);

-- ── 4. IBP activity log ────────────────────────────────────────────────────

create table if not exists public.ibp_activity_log (
  id uuid primary key default gen_random_uuid(),
  ibp_id uuid not null references public.ibp(id) on delete cascade,
  admin_id uuid,
  action text not null,
  details jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists ibp_activity_log_ibp_idx on public.ibp_activity_log (ibp_id, created_at desc);

-- ── 5. RLS (platform admins only — service-role routes do the real work) ───

alter table public.ibp_products enable row level security;
alter table public.ibp_activity_log enable row level security;

drop policy if exists ibp_products_admin_select on public.ibp_products;
create policy ibp_products_admin_select on public.ibp_products
  for select using (public.is_platform_admin(auth.uid()));

drop policy if exists ibp_products_admin_write on public.ibp_products;
create policy ibp_products_admin_write on public.ibp_products
  for all using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists ibp_activity_log_admin_select on public.ibp_activity_log;
create policy ibp_activity_log_admin_select on public.ibp_activity_log
  for select using (public.is_platform_admin(auth.uid()));

drop policy if exists ibp_activity_log_admin_insert on public.ibp_activity_log;
create policy ibp_activity_log_admin_insert on public.ibp_activity_log
  for insert with check (public.is_platform_admin(auth.uid()));

-- ── 6. KPI RPCs ────────────────────────────────────────────────────────────

-- Users menu KPI row (adds NHIS-linked presence count per decision C-D4).
create or replace function public.get_user_kpi_stats()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_users', (select count(*) from user_profiles where role = 'user'),
    'active_30d', (
      select count(*) from user_profiles
      where role = 'user' and status = 'active'
        and last_active >= now() - interval '30 days'
    ),
    'premium', (
      select count(*) from user_subscriptions
      where status = 'active'
    ),
    'nhis_linked', (
      select count(*) from user_profiles
      where role = 'user' and nhis_number is not null and nhis_number <> ''
    ),
    'flagged', (
      select count(*) from content_moderation_flags
      where content_type = 'profile' and status = 'pending_review'
    ),
    'delete_requests_pending', (
      select count(*) from delete_account_requests where status = 'pending'
    )
  ) into result;
  return result;
end;
$$;

-- IBP menu KPI row.
create or replace function public.get_ibp_kpi_stats()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*) from ibp),
    'active_published', (
      select count(*) from ibp
      where status = 'active' and verified_at is not null
    ),
    'pending_verification', (
      select count(*) from ibp where status = 'pending'
    ),
    'premium', (
      select count(*) from ibp where is_featured = true
    ),
    'products_published', (
      select count(*) from ibp_products where status = 'published'
    ),
    'products_pending', (
      select count(*) from ibp_products where status = 'pending'
    ),
    'suspended', (
      select count(*) from ibp where status = 'suspended'
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_user_kpi_stats() from public, anon, authenticated;
revoke all on function public.get_ibp_kpi_stats() from public, anon, authenticated;
grant execute on function public.get_user_kpi_stats() to service_role;
grant execute on function public.get_ibp_kpi_stats() to service_role;

comment on function public.get_user_kpi_stats() is
  'Users menu KPIs: total/active/premium/NHIS-linked/flagged/delete-requests.';
comment on function public.get_ibp_kpi_stats() is
  'IBP menu KPIs: total/active/pending/premium/products/suspended.';
