-- =============================================================================
-- Content engagement pipeline (Mapping Audit Part 4 / Epic 30.1).
--
-- Likes & Saves for health content: one polymorphic table records every
-- user like/save against conditions, symptoms, healthy-living articles and
-- fitness exercises. The admin panel aggregates it behind `engagement.view`;
-- the mobile app reads/writes it through /api/user/content-engagement
-- (JWT-authed, user-scoped only).
--
--   content_engagement   - source of truth (one row per user/content/action)
--   conditions counters  - denormalised like_count/save_count maintained by
--                          trigger so the Diseases list stays O(1); columns
--                          guarded here too (also added by the Part I
--                          conditions extension — if-not-exists either way).
--
-- RLS enabled with no policies: service-role server routes only.
-- RBAC: seeds `engagement.view` (admin + content_manager; analyst inherits
-- all *.view via the catalog filter). Mirrors lib/permissions.ts.
-- Additive and re-runnable.
-- =============================================================================

-- 1. Polymorphic engagement ledger ------------------------------------------------
create table if not exists public.content_engagement (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null
    check (content_type in ('condition', 'symptom', 'healthy_living', 'fitness_exercise')),
  content_id uuid not null,
  action text not null check (action in ('like', 'save')),
  created_at timestamptz not null default now(),
  constraint content_engagement_pkey primary key (id),
  constraint content_engagement_one_per_user_content_action
    unique (user_id, content_type, content_id, action)
);

comment on table public.content_engagement is
  'User likes/saves against health content (audit doc Part 4). Polymorphic: content_type + content_id; validated by trigger.';

create index if not exists idx_content_engagement_content
  on public.content_engagement (content_type, content_id);
create index if not exists idx_content_engagement_user
  on public.content_engagement (user_id);
create index if not exists idx_content_engagement_created_at
  on public.content_engagement (created_at);

-- 2. Target validation ------------------------------------------------------------
-- No real FKs are possible across four tables, so a BEFORE INSERT trigger
-- rejects rows whose content_id does not exist in the matching table.
create or replace function public.validate_content_engagement_target()
returns trigger
language plpgsql
as $$
declare
  target_exists boolean;
begin
  select case new.content_type
    when 'condition' then exists (select 1 from public.conditions where id = new.content_id)
    when 'symptom' then exists (select 1 from public.symptoms where id = new.content_id)
    when 'healthy_living' then exists (select 1 from public.healthy_living_info where id = new.content_id)
    when 'fitness_exercise' then exists (select 1 from public.fitness_exercises where id = new.content_id)
  end into target_exists;

  if target_exists is distinct from true then
    raise exception 'content_engagement target not found: % %',
      new.content_type, new.content_id
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_content_engagement_validate on public.content_engagement;
create trigger trg_content_engagement_validate
  before insert on public.content_engagement
  for each row
  execute function public.validate_content_engagement_target();

-- 3. Condition counters ------------------------------------------------------------
-- Guarded column shells (Part I's conditions extension also adds them;
-- whichever runs first wins).
alter table public.conditions
  add column if not exists like_count integer not null default 0,
  add column if not exists save_count integer not null default 0;

create or replace function public.maintain_condition_engagement_counters()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.content_type = 'condition' then
    if new.action = 'like' then
      update public.conditions set like_count = like_count + 1 where id = new.content_id;
    else
      update public.conditions set save_count = save_count + 1 where id = new.content_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' and old.content_type = 'condition' then
    if old.action = 'like' then
      update public.conditions set like_count = greatest(like_count - 1, 0) where id = old.content_id;
    else
      update public.conditions set save_count = greatest(save_count - 1, 0) where id = old.content_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_content_engagement_counters on public.content_engagement;
create trigger trg_content_engagement_counters
  after insert or delete on public.content_engagement
  for each row
  execute function public.maintain_condition_engagement_counters();

-- 4. RLS: service-role-only surface ------------------------------------------------
alter table public.content_engagement enable row level security;
-- No policies: admin/mobile traffic goes through service-role server routes.

-- 5. RBAC seed ----------------------------------------------------------------------
-- Mirrors lib/permissions.ts (PERMISSION_CATALOG + ROLE_DEFAULTS).
insert into public.admin_permissions (key, resource, action, description) values
  ('engagement.view', 'engagement', 'view', 'View content engagement analytics')
on conflict (key) do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'engagement.view'),
  ('content_manager', 'engagement.view')
on conflict do nothing;
