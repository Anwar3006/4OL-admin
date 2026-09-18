-- =============================================================================
-- Consolidate the "registrar" entity.
--
-- Before this migration the same field-worker entity was split three ways:
--   1. The `registrar` app role (user_profiles.role, unchanged by this file).
--   2. `data_collectors` — facility-scout's roster (employee_id, assigned
--      areas, submission counters), referenced by `collector_submissions`
--      and `facility_scout_submissions.assigned_collector_id`.
--   3. `map_collectors` — the map feature's simpler roster (assigned_region,
--      gps_status, notes), with no FK from any other table.
--
-- This migration renames data_collectors -> registrars (a RENAME, not a
-- create+copy, so both existing foreign keys are preserved automatically —
-- Postgres tracks FKs by OID, not name), folds map_collectors' columns and
-- rows into it, repoints the auto-assign trigger, and drops map_collectors.
--
-- `registrar_locations` (240 historical rows, zero live code references —
-- superseded by this same lineage back in ~May 2026) and `collector_submissions`
-- (0 rows, explicitly left alone per facility-scout's N-D1 decision) are
-- deliberately NOT touched here.
--
-- Not mobile-contracted: neither data_collectors nor map_collectors appears
-- in tests/contract/mobile-contract.ts, and the Expo app has zero references
-- to either table name. The one thing that IS mobile-contracted nearby —
-- facility_scout_config.collector_auto_assign and
-- facility_scout_submissions.assigned_collector_id — keeps its column name
-- unchanged here; renaming those needs an additive migration plus a shipped
-- mobile release per CLAUDE.md's mobile-contract rule, not a same-day rename.
-- =============================================================================

-- 1. Rename data_collectors -> registrars. Preserves the primary key and both
--    existing FKs (collector_submissions_collector_id_fkey,
--    facility_scout_submissions_assigned_collector_id_fkey).
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'data_collectors')
     and not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'registrars') then
    alter table public.data_collectors rename to registrars;
  end if;
end $$;

-- 2. Add map_collectors' columns onto registrars.
alter table public.registrars
  add column if not exists gps_status text not null default 'inactive'
    check (gps_status in ('active', 'weak', 'inactive')),
  add column if not exists notes text;

-- 3. Migrate map_collectors data into registrars by matching user_id. A
--    single assigned_region folds into the (richer) region text[] array if
--    not already present, so no data is lost.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'map_collectors') then
    update public.registrars r
    set
      gps_status = mc.gps_status,
      notes = coalesce(mc.notes, r.notes),
      region = case
        when mc.assigned_region is not null
             and not (mc.assigned_region = any(coalesce(r.region, '{}')))
          then coalesce(r.region, '{}') || mc.assigned_region
        else r.region
      end
    from public.map_collectors mc
    where mc.user_id = r.user_id;

    -- Any map_collectors row with no matching registrars row (a collector
    -- provisioned only through the Map feature) is inserted fresh.
    insert into public.registrars (user_id, employee_id, region, gps_status, notes, is_active)
    select
      mc.user_id,
      'MAP-' || mc.id,
      case when mc.assigned_region is not null then array[mc.assigned_region] else '{}' end,
      mc.gps_status,
      mc.notes,
      true
    from public.map_collectors mc
    where not exists (select 1 from public.registrars r where r.user_id = mc.user_id);
  end if;
end $$;

-- 4. Repoint the facility-scout auto-assign trigger at registrars (columns
--    it reads — id, is_active, region, last_active_at — are unchanged).
create or replace function public.assign_scout_submission_collector()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_auto_assign boolean;
  v_collector_id uuid;
begin
  select collector_auto_assign into v_auto_assign
  from public.facility_scout_config
  where id = 1;

  if not coalesce(v_auto_assign, false) then
    return new;
  end if;

  -- Prefer a regional match.
  select dc.id into v_collector_id
  from public.registrars dc
  where dc.is_active = true
    and new.region is not null
    and new.region = any (dc.region)
  order by (
    select count(*) from public.facility_scout_submissions s
    where s.assigned_collector_id = dc.id and s.status = 'field_review'
  ) asc, dc.last_active_at asc nulls first
  limit 1;

  -- Fall back to any active collector.
  if v_collector_id is null then
    select dc.id into v_collector_id
    from public.registrars dc
    where dc.is_active = true
    order by (
      select count(*) from public.facility_scout_submissions s
      where s.assigned_collector_id = dc.id and s.status = 'field_review'
    ) asc, dc.last_active_at asc nulls first
    limit 1;
  end if;

  -- No active collector at all — leave pending for the manual queue.
  if v_collector_id is null then
    return new;
  end if;

  new.assigned_collector_id := v_collector_id;
  new.status := 'field_review';
  new.priority := 'normal';
  new.sla_due_at := now() + interval '5 days';

  return new;
end;
$$;

-- 5. Drop map_collectors — fully migrated, zero external FK dependents.
drop table if exists public.map_collectors;

-- 6. Rebuild RLS on registrars. The old data_collectors policies used
--    is_admin(), which (per its own definition) treats role='registrar' as
--    admin-equivalent — so today any registrar could mutate any OTHER
--    registrar's roster row, not just their own. map_collectors used the
--    stricter is_app_admin() (admin/super_admin only). Standardizing on the
--    stricter one closes that gap; zero live registrar accounts existed
--    before this migration (per 20260909_registrar_data_collector_scope.sql's
--    own note), so this is not a behavioural regression for any real user.
drop policy if exists "admin delete collectors" on public.registrars;
drop policy if exists "admin manage collectors" on public.registrars;
drop policy if exists "admin update collectors" on public.registrars;
drop policy if exists "own collector record or admin" on public.registrars;
drop policy if exists "map_collectors_admin" on public.registrars;

create policy "registrars_select_own_or_admin" on public.registrars
  for select to authenticated
  using (auth.uid() = user_id or is_app_admin());

create policy "registrars_admin_insert" on public.registrars
  for insert to authenticated
  with check (is_app_admin());

create policy "registrars_admin_update" on public.registrars
  for update to authenticated
  using (is_app_admin())
  with check (is_app_admin());

create policy "registrars_admin_delete" on public.registrars
  for delete to authenticated
  using (is_app_admin());

comment on table public.registrars is
  'Field registrars — the single roster table for the registrar role. Consolidated 2026-09-18 from data_collectors (facility-scout) and map_collectors (map feature); see CLAUDE.md.';
