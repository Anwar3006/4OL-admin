-- ============================================================================
-- Anatomy extension (Gap Analysis Part A — Phase 0)
--
-- Adds the taxonomy columns the mockup's Body Map needs (body_system,
-- gender_scope, icon, description, display_order), hotspot geometry for the
-- interactive SVG map, ICD-11 codes on conditions, the Healthy Living
-- body-part junction (tab 4), an interaction tracking table for the
-- "Map Interactions (30d)" KPI, and persists the live-DB-only
-- get_body_part_stats() RPC so it survives a fresh restore.
--
-- All statements are additive and idempotent-safe (guarded).
-- ============================================================================

-- ── 1. body_parts taxonomy columns ─────────────────────────────────────────

alter table public.body_parts
  add column if not exists body_system text,
  add column if not exists gender_scope text default 'unspecified',
  add column if not exists icon text,
  add column if not exists description text,
  add column if not exists display_order int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'body_parts_gender_scope_check'
  ) then
    alter table public.body_parts
      add constraint body_parts_gender_scope_check
      check (gender_scope in ('female','male','shared','unspecified'));
  end if;
end;
$$;

-- Backfill body_system from the same keyword logic the API route used, so
-- the system sub-tabs work immediately after the migration is applied.
update public.body_parts
set body_system = case
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(heart|arter|vein|blood|cardiac|vascular)' then 'cardiovascular'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(brain|nerve|spinal|neural|head)' then 'nervous'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(bone|skull|spine|rib|joint|knee|arm|leg|muscle)' then 'skeletal'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(lung|throat|nose|airway|bronch|chest)' then 'respiratory'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(stomach|intestin|liver|digest|gut|bowel)' then 'digestive'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(kidney|bladder|urinar)' then 'urinary'
  when lower(name || ' ' || coalesce(path::text, '')) ~ '(uterus|ovary|testi|prostate|reproduc|breast)' then 'reproductive'
  else 'general'
end
where body_system is null;

-- ── 2. Hotspot geometry for the interactive SVG body map ───────────────────

create table if not exists public.anatomy_hotspots (
  id uuid primary key default gen_random_uuid(),
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  gender text not null default 'shared'
    check (gender in ('female','male','shared')),
  view text not null default 'front'
    check (view in ('front','back')),
  body_system text,
  svg_path_id text,
  cx numeric not null default 0,
  cy numeric not null default 0,
  rx numeric not null default 12,
  ry numeric not null default 12,
  is_organ boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists anatomy_hotspots_part_idx
  on public.anatomy_hotspots (body_part_id);
create index if not exists anatomy_hotspots_system_idx
  on public.anatomy_hotspots (body_system);

-- ── 3. ICD-11 on conditions (tab 2 column) ─────────────────────────────────

alter table public.conditions
  add column if not exists icd11_code text;

-- ── 4. Healthy Living ↔ body parts junction (tab 4) ────────────────────────

create table if not exists public.healthy_living_body_parts (
  tip_id uuid not null references public.healthy_living_info(id) on delete cascade,
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, body_part_id)
);

-- ── 5. Map interaction tracking ("Map Interactions 30d" KPI) ───────────────

create table if not exists public.anatomy_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(user_id) on delete set null,
  body_part_id uuid references public.body_parts(id) on delete set null,
  source text not null default 'mobile',
  created_at timestamptz not null default now()
);

create index if not exists anatomy_interactions_created_idx
  on public.anatomy_interactions (created_at);

-- ── 6. Persist the live-DB-only get_body_part_stats() RPC ──────────────────
-- Consumed by useSymptomStats (bodyPartDistribution). Returns per-part
-- symptom + condition link counts.

create or replace function public.get_body_part_stats()
returns table (
  body_part_id uuid,
  body_part_name text,
  symptom_count bigint,
  condition_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    bp.id,
    bp.name,
    coalesce(s.cnt, 0) as symptom_count,
    coalesce(c.cnt, 0) as condition_count
  from public.body_parts bp
  left join (
    select body_part_id, count(*) as cnt
    from public.symptom_body_parts
    group by body_part_id
  ) s on s.body_part_id = bp.id
  left join (
    select body_part_id, count(*) as cnt
    from public.condition_body_parts
    group by body_part_id
  ) c on c.body_part_id = bp.id
  order by (coalesce(s.cnt, 0) + coalesce(c.cnt, 0)) desc, bp.name asc;
$$;

revoke all on function public.get_body_part_stats() from public;
grant execute on function public.get_body_part_stats() to authenticated, service_role;

-- ── 7. Anatomy overview KPI helper ─────────────────────────────────────────

create or replace function public.get_anatomy_overview_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'body_parts_mapped', (select count(*) from public.body_parts),
    'condition_links', (select count(*) from public.condition_body_parts),
    'symptom_links', (select count(*) from public.symptom_body_parts),
    'map_interactions_30d', (
      select count(*) from public.anatomy_interactions
      where created_at >= now() - interval '30 days'
    ),
    'healthy_tip_links', (select count(*) from public.healthy_living_body_parts),
    'hotspots', (select count(*) from public.anatomy_hotspots)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_anatomy_overview_stats() from public;
revoke all on function public.get_anatomy_overview_stats() from anon;
grant execute on function public.get_anatomy_overview_stats() to authenticated, service_role;

-- ── 8. RLS (admin reads via service role; keep tables locked down) ─────────

alter table public.anatomy_hotspots enable row level security;
alter table public.healthy_living_body_parts enable row level security;
alter table public.anatomy_interactions enable row level security;

create policy anatomy_hotspots_admin_read on public.anatomy_hotspots
  for select to authenticated
  using (public.is_platform_admin(auth.uid()));

create policy anatomy_interactions_insert on public.anatomy_interactions
  for insert to authenticated
  with check (auth.uid() is null or user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create policy anatomy_interactions_admin_read on public.anatomy_interactions
  for select to authenticated
  using (public.is_platform_admin(auth.uid()));
