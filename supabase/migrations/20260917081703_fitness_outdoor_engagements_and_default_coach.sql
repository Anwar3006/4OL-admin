-- Fitness operations completion:
-- 1. One canonical, per-user engagement record for every Outdoor route/event.
-- 2. A stable public coach alias until the trainer directory is built.
-- 3. Health Integration aggregates required by the admin mock-up.

create table if not exists public.fitness_outdoor_engagements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  target_type text not null check (target_type in ('route', 'event')),
  target_id uuid not null,
  will_visit_at timestamptz,
  completed_at timestamptz,
  is_liked boolean not null default false,
  rating smallint check (rating between 1 and 5),
  shared_count integer not null default 0 check (shared_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

comment on table public.fitness_outdoor_engagements is
  'One row per user and Outdoor route/event, backing Will Visit, Completed, Like, Rating and Share/Invite actions.';

create index if not exists fitness_outdoor_engagements_target_idx
  on public.fitness_outdoor_engagements (target_type, target_id);
create index if not exists fitness_outdoor_engagements_completed_idx
  on public.fitness_outdoor_engagements (completed_at desc)
  where completed_at is not null;
create index if not exists fitness_outdoor_engagements_rating_idx
  on public.fitness_outdoor_engagements (rating desc)
  where rating is not null;

create or replace function public.validate_fitness_outdoor_engagement_target()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.target_type = 'route' and not exists (
    select 1 from public.fitness_outdoor_routes where id = new.target_id
  ) then
    raise exception 'Outdoor route does not exist';
  end if;

  if new.target_type = 'event' and not exists (
    select 1 from public.fitness_outdoor_events where id = new.target_id
  ) then
    raise exception 'Outdoor event does not exist';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_fitness_outdoor_engagement_target
  on public.fitness_outdoor_engagements;
create trigger validate_fitness_outdoor_engagement_target
  before insert or update of target_type, target_id, will_visit_at,
    completed_at, is_liked, rating, shared_count
  on public.fitness_outdoor_engagements
  for each row execute function public.validate_fitness_outdoor_engagement_target();

alter table public.fitness_outdoor_engagements enable row level security;

revoke all on table public.fitness_outdoor_engagements from anon, authenticated;
grant select, insert, update, delete on table public.fitness_outdoor_engagements to authenticated;
grant all on table public.fitness_outdoor_engagements to service_role;

drop policy if exists "outdoor_engagements_select_own_or_admin"
  on public.fitness_outdoor_engagements;
create policy "outdoor_engagements_select_own_or_admin"
  on public.fitness_outdoor_engagements for select to authenticated
  using ((select auth.uid()) = user_id or public.is_app_admin());

drop policy if exists "outdoor_engagements_insert_own"
  on public.fitness_outdoor_engagements;
create policy "outdoor_engagements_insert_own"
  on public.fitness_outdoor_engagements for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "outdoor_engagements_update_own"
  on public.fitness_outdoor_engagements;
create policy "outdoor_engagements_update_own"
  on public.fitness_outdoor_engagements for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "outdoor_engagements_delete_own"
  on public.fitness_outdoor_engagements;
create policy "outdoor_engagements_delete_own"
  on public.fitness_outdoor_engagements for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Task/FITNESS_TASK calls for a public coach attribution, not a live trainer
-- marketplace. Use the documented stock alias consistently until that future
-- feature is intentionally launched.
update public.fitness_plans
set coach_display_name = 'Coach Ama'
where coach_display_name is null or btrim(coach_display_name) = '';

alter table public.fitness_plans
  alter column coach_display_name set default 'Coach Ama';

-- Match the Health Integration mock-up with real connected-user and daily-sync
-- counts. config_data.data_types is optional, so older platform rows remain
-- compatible and report an empty list rather than invented capabilities.
drop function if exists public.get_fitness_health_sync_stats();
create or replace function public.get_fitness_health_sync_stats()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'platforms', (
      select coalesce(jsonb_agg(row_to_json(pl)), '[]'::jsonb)
      from (
        select p.id,
               p.platform_name,
               p.is_enabled,
               p.sync_frequency_mins,
               case
                 when jsonb_typeof(p.config_data -> 'data_types') = 'array'
                   then p.config_data -> 'data_types'
                 else '[]'::jsonb
               end as data_types,
               count(distinct l.user_id) as connected_users,
               count(l.id) filter (where l.synced_at >= current_date) as synced_today,
               count(l.id) filter (where l.status = 'success') as sync_success,
               count(l.id) filter (where l.status = 'failure') as sync_failures,
               max(l.synced_at) as last_sync_at
        from public.fitness_health_platforms p
        left join public.fitness_health_sync_logs l on l.platform_id = p.id
        group by p.id
        order by p.platform_name
      ) pl
    ),
    'recent_failures', (
      select coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      from (
        select l.synced_at, l.status, l.error_details, l.retry_count,
               p.platform_name,
               trim(concat_ws(' ', up.first_name, up.last_name)) as user_name
        from public.fitness_health_sync_logs l
        left join public.fitness_health_platforms p on p.id = l.platform_id
        left join public.user_profiles up on up.user_id = l.user_id
        where l.status = 'failure'
        order by l.synced_at desc
        limit 20
      ) f
    )
  );
$$;

-- PostgREST can retain the old schema until its next refresh. Reload it as
-- part of the migration so the new Outdoor table is queryable immediately.
notify pgrst, 'reload schema';

revoke all on function public.get_fitness_health_sync_stats() from public;
grant execute on function public.get_fitness_health_sync_stats() to authenticated, service_role;
