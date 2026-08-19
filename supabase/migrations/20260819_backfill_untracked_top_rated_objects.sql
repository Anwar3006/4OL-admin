-- =============================================================================
-- Backfill objects that were only ever applied via untracked root-level
-- scratch SQL files (complete_top_rated_migration.sql, search_top_rated_items.sql,
-- top_rated_kpi_and_facility_sync_trigger.sql, rls_helper_functions.sql), all
-- deleted as "cleanup" in the Epic 31 RBAC commit. They were live in
-- production but had no tracked migration, so a fresh database build (new
-- dev environment, CI, disaster recovery) was silently missing:
--   - public.is_app_admin() — relied on by RLS policies since 2026-07-19
--     (20260719_fix_fitness_kpis.sql) but never defined in any migration.
--   - public.top_rated_items — read/written by 20260813_epic30_rpc_authorization_audit.sql
--     and 20260815_fix_facilities_map_and_top_rated_module_data.sql but never created.
--   - public.search_top_rated_items() — still called from
--     app/(dashboard)/top-rated/_components/AddTopRatedItemDialog.tsx.
--   - public.sync_top_rated_facility_flag() trigger — keeps
--     facility_profile.is_top_rated in sync with top_rated_items.
--
-- admin_upsert_top_rated_item / admin_remove_top_rated_item are NOT
-- reproduced here: 20260813_epic30_rpc_authorization_audit.sql already owns
-- the current, authoritative definitions.
--
-- Additive and re-runnable: every object uses IF NOT EXISTS / CREATE OR
-- REPLACE / DROP ... IF EXISTS before CREATE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS helper functions (rls_helper_functions.sql).
-- -----------------------------------------------------------------------------
create or replace function public.request_user_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::text
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id::text = public.request_user_id()
      and up.role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.request_user_id() to anon, authenticated;
grant execute on function public.is_app_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. top_rated_items table (complete_top_rated_migration.sql).
-- -----------------------------------------------------------------------------
create table if not exists public.top_rated_items (
    id uuid primary key default gen_random_uuid(),
    module text not null check (module in ('facility', 'outdoor_route', 'outdoor_event', 'challenge', 'exercise', 'fitness_plan')),
    item_id uuid not null,
    title text not null,
    subtitle text,
    image_url text,
    rating numeric,
    rating_count integer,
    source text not null check (source in ('manual', 'subscription')),
    rank integer,
    added_by uuid references public.user_profiles(user_id),
    added_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists top_rated_items_module_item_unique
    on public.top_rated_items (module, item_id);

create index if not exists top_rated_items_module_idx
    on public.top_rated_items (module);

create index if not exists top_rated_items_shelf_sort_idx
    on public.top_rated_items (rank, rating desc, added_at desc);

alter table public.top_rated_items enable row level security;

drop policy if exists "top_rated_items_select" on public.top_rated_items;
create policy "top_rated_items_select"
    on public.top_rated_items
    for select
    to authenticated
    using (true);

drop policy if exists "top_rated_items_insert" on public.top_rated_items;
create policy "top_rated_items_insert"
    on public.top_rated_items
    for insert
    to authenticated
    with check (public.is_app_admin());

drop policy if exists "top_rated_items_update" on public.top_rated_items;
create policy "top_rated_items_update"
    on public.top_rated_items
    for update
    to authenticated
    using (public.is_app_admin())
    with check (public.is_app_admin());

drop policy if exists "top_rated_items_delete" on public.top_rated_items;
create policy "top_rated_items_delete"
    on public.top_rated_items
    for delete
    to authenticated
    using (public.is_app_admin());

drop trigger if exists trg_top_rated_items_updated_at on public.top_rated_items;
create trigger trg_top_rated_items_updated_at
  before update on public.top_rated_items
  for each row
  execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. search_top_rated_items RPC (search_top_rated_items.sql) — still called
--    from AddTopRatedItemDialog.tsx.
-- -----------------------------------------------------------------------------
create or replace function public.search_top_rated_items(
  p_table_name text,
  p_search_term text default null,
  p_page int default 1,
  p_limit int default 10
)
returns table (
  id uuid,
  title text,
  subtitle text,
  image_url text,
  rating_average numeric,
  rating_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table_name = 'facility' then
    return query
      select
        fp.id,
        fp.facility_name as title,
        fp.area as subtitle,
        fp.featured_image_url as image_url,
        coalesce(fp.avg_rating, 0)::numeric as rating_average,
        0::int as rating_count
      from facility_profile fp
      where (fp.status is null or lower(fp.status::text) in ('active', 'approved', 'pending'))
        and (p_search_term is null or p_search_term = '' or
             fp.facility_name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'fitness_plan' then
    return query
      select
        fp.id,
        fp.title,
        fp.description as subtitle,
        null::text as image_url,
        coalesce(fp.average_rating, 0)::numeric as rating_average,
        coalesce(fp.rating_count, 0)::int as rating_count
      from fitness_plans fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'outdoor_route' then
    return query
      select
        fp.id,
        fp.name as title,
        fp.area as subtitle,
        (case when array_length(fp.image_urls, 1) > 0 then fp.image_urls[1] else null end) as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_routes fp
      where (fp.is_active = true or fp.is_active is null)
        and (p_search_term is null or p_search_term = '' or
             fp.name ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%' or
             fp.category ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'outdoor_event' then
    return query
      select
        fp.id,
        fp.title,
        fp.area as subtitle,
        null::text as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_outdoor_events fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.area ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'challenge' then
    return query
      select
        fp.id,
        fp.title,
        fp.description as subtitle,
        fp.featured_image_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_challenges fp
      where (p_search_term is null or p_search_term = '' or
             fp.title ilike '%' || p_search_term || '%' or
             fp.description ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  elsif p_table_name = 'exercise' then
    return query
      select
        fp.id,
        fp.exercise_name as title,
        fp.primary_muscle_group as subtitle,
        fp.thumbnail_url as image_url,
        null::numeric as rating_average,
        null::int as rating_count
      from fitness_exercises fp
      where fp.is_active = true
        and fp.status in ('published', 'draft')
        and (p_search_term is null or p_search_term = '' or
             fp.exercise_name ilike '%' || p_search_term || '%' or
             fp.primary_muscle_group ilike '%' || p_search_term || '%')
      order by fp.created_at desc
      limit p_limit offset (p_page - 1) * p_limit;

  else
    return;
  end if;
end;
$$;

grant execute on function public.search_top_rated_items(text, text, int, int) to authenticated;
grant execute on function public.search_top_rated_items(text, text, int, int) to service_role;
grant execute on function public.search_top_rated_items(text, text, int, int) to anon;

-- -----------------------------------------------------------------------------
-- 4. facility_profile.is_top_rated sync trigger (top_rated_kpi_and_facility_sync_trigger.sql).
-- -----------------------------------------------------------------------------
create or replace function public.sync_top_rated_facility_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if new.module = 'facility' then
      update public.facility_profile
      set is_top_rated = true,
          updated_at = now()
      where id = new.item_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.module = 'facility' then
      update public.facility_profile
      set is_top_rated = false,
          updated_at = now()
      where id = old.item_id
        and not exists (
          select 1 from public.top_rated_items
          where module = 'facility' and item_id = old.item_id
        );
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_top_rated_items_sync_facility on public.top_rated_items;
create trigger trg_top_rated_items_sync_facility
  after insert or update or delete on public.top_rated_items
  for each row
  execute function public.sync_top_rated_facility_flag();
