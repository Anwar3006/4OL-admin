-- =============================================================================
-- Symptoms + Healthy Living analytics & carousel extension
-- (Analytics/Carousels build — Phases 0, 1, 5b).
--
-- Phase 0 — drift persistence (repo ⇄ prod parity, "Schema drift" pitfall):
--   symptoms.severity, symptom_views, healthy_living_views,
--   healthy_living_categories, increment_*_view_count RPCs and
--   get_healthy_living_kpi_stats all existed live-only; they are persisted
--   here following the anatomy_extension precedent. CREATE TABLE IF NOT
--   EXISTS / CREATE OR REPLACE keep this re-runnable against the live DB
--   where the objects already exist.
--
-- Phase 1 — analytics RPCs: get_symptom_analytics(),
--   get_healthy_living_analytics(). Backed by /api/symptoms/analytics and
--   /api/healthy-living/analytics (requireAdminApiUser).
--
-- Phase 5b — carousel parity with Diseases: featured_order/featured_from on
--   symptoms + healthy_living_info (symptoms.is_featured pre-exists;
--   healthy_living gains is_featured here), feature-slot cap enforced by
--   /api/{symptoms,healthy-living}/[id]/feature, plus get_home_carousel()
--   (Phase 5c) which merges the three featured sets for the mobile carousel.
--
-- Additive and re-runnable throughout.
-- =============================================================================

-- ── 1. Carousel + taxonomy columns ─────────────────────────────────────────

alter table public.symptoms
  add column if not exists severity text,
  add column if not exists featured_order integer,
  add column if not exists featured_from timestamptz;

create index if not exists idx_symptoms_featured_order
  on public.symptoms (featured_order)
  where is_featured = true;
create index if not exists idx_symptoms_severity
  on public.symptoms (severity);

alter table public.healthy_living_info
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_order integer,
  add column if not exists featured_from timestamptz;

create index if not exists idx_healthy_living_featured_order
  on public.healthy_living_info (featured_order)
  where is_featured = true;

-- ── 2. category_type vocabulary ─────────────────────────────────────────────
-- useCategoriesForHealthyLiving already filters type='healthy_living';
-- persist the enum value so fresh restores match prod. Cast to ::text when
-- comparing inside this same migration (a value added in-transaction cannot
-- be resolved as an enum literal by later statements in the same file).

do $$
begin
  alter type public.category_type add value 'healthy_living';
exception
  when duplicate_object then null;
end;
$$;

-- ── 3. Healthy Living ↔ categories junction (live-only drift) ──────────────
-- Client-side hooks (useHealthyLiving create/update) write this junction
-- directly, so authenticated admins need select/insert/delete policies.

create table if not exists public.healthy_living_categories (
  healthy_living_id uuid not null
    references public.healthy_living_info(id) on delete cascade,
  category_id uuid not null
    references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (healthy_living_id, category_id)
);

alter table public.healthy_living_categories enable row level security;

drop policy if exists healthy_living_categories_admin_read on public.healthy_living_categories;
create policy healthy_living_categories_admin_read on public.healthy_living_categories
  for select to authenticated
  using (public.is_platform_admin(auth.uid()));

drop policy if exists healthy_living_categories_admin_write on public.healthy_living_categories;
create policy healthy_living_categories_admin_write on public.healthy_living_categories
  for insert to authenticated
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists healthy_living_categories_admin_delete on public.healthy_living_categories;
create policy healthy_living_categories_admin_delete on public.healthy_living_categories
  for delete to authenticated
  using (public.is_platform_admin(auth.uid()));

-- ── 4. Unique-viewer telemetry (live-only drift) ────────────────────────────
-- Written exclusively through the SECURITY DEFINER increment RPCs below
-- (mobile hooks useTrackSymptomView / useTrackHealthyLivingView), so RLS is
-- enabled with no direct policies — mirrors content_engagement.

create table if not exists public.symptom_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symptom_id uuid not null references public.symptoms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, symptom_id)
);

create index if not exists idx_symptom_views_created
  on public.symptom_views (created_at);

create table if not exists public.healthy_living_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  healthy_living_id uuid not null
    references public.healthy_living_info(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, healthy_living_id)
);

create index if not exists idx_healthy_living_views_created
  on public.healthy_living_views (created_at);

alter table public.symptom_views enable row level security;
alter table public.healthy_living_views enable row level security;

-- ── 5. View-count increment RPCs (live-only drift) ──────────────────────────
-- Dedupe: the UNIQUE(user_id, content_id) insert lands once per user/content;
-- view_count only bumps when the insert actually added a row, so repeated
-- opens from the same user are safe no-ops.

create or replace function public.increment_symptom_view_count(
  symptom_id_param uuid,
  user_id_param uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.symptom_views (user_id, symptom_id)
  values (user_id_param, symptom_id_param)
  on conflict (user_id, symptom_id) do nothing;

  if found then
    update public.symptoms
    set view_count = coalesce(view_count, 0) + 1
    where id = symptom_id_param;
  end if;
end;
$$;

create or replace function public.increment_healthy_living_view_count(
  healthy_living_id_param uuid,
  user_id_param uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.healthy_living_views (user_id, healthy_living_id)
  values (user_id_param, healthy_living_id_param)
  on conflict (user_id, healthy_living_id) do nothing;

  if found then
    update public.healthy_living_info
    set view_count = coalesce(view_count, 0) + 1
    where id = healthy_living_id_param;
  end if;
end;
$$;

revoke all on function public.increment_symptom_view_count(uuid, uuid) from public;
grant execute on function public.increment_symptom_view_count(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.increment_healthy_living_view_count(uuid, uuid) from public;
grant execute on function public.increment_healthy_living_view_count(uuid, uuid)
  to authenticated, service_role;

-- ── 6. Persist get_healthy_living_kpi_stats (live-only drift) ───────────────
-- Consumed by HealthyLivingStats (3-KPI row). Deltas are month-over-month
-- percentages based on created_at.

-- Return type changes from json to TABLE(...); CREATE OR REPLACE cannot.
drop function if exists public.get_healthy_living_kpi_stats();

create or replace function public.get_healthy_living_kpi_stats()
returns table (
  total_articles bigint,
  total_delta integer,
  published_articles bigint,
  published_delta integer,
  total_views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with deltas as (
    select
      count(*) filter (where created_at >= now() - interval '30 days') as total_new,
      count(*) filter (where created_at < now() - interval '30 days') as total_prev,
      count(*) filter (where status = 'published' and created_at >= now() - interval '30 days') as pub_new,
      count(*) filter (where status = 'published' and created_at < now() - interval '30 days') as pub_prev
    from public.healthy_living_info
  )
  select
    (select count(*) from public.healthy_living_info),
    case when total_prev = 0 then (case when total_new > 0 then 100 else 0 end)
         else round((total_new::numeric / total_prev) * 100) end,
    (select count(*) from public.healthy_living_info where status = 'published'),
    case when pub_prev = 0 then (case when pub_new > 0 then 100 else 0 end)
         else round((pub_new::numeric / pub_prev) * 100) end,
    (select coalesce(sum(view_count), 0) from public.healthy_living_info)
  from deltas;
$$;

revoke all on function public.get_healthy_living_kpi_stats() from public;
grant execute on function public.get_healthy_living_kpi_stats()
  to authenticated, service_role;

-- ── 7. Symptoms analytics RPC (Phase 1) ─────────────────────────────────────
-- Single definition source for the Symptoms Analytics tab. Engagement parts
-- degrade gracefully (engagement_pipeline_live=false) until the
-- content_engagement migration (Epic 30.1) is applied.

create or replace function public.get_symptom_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_totals jsonb;
  v_view_trend jsonb;
  v_body_parts jsonb;
  v_categories jsonb;
  v_top_viewed jsonb;
  v_top_liked jsonb := '[]'::jsonb;
  v_top_saved jsonb := '[]'::jsonb;
  v_engagement jsonb := 'null'::jsonb;
  v_pipeline_live boolean := false;
  v_completeness jsonb;
begin
  select jsonb_build_object(
    'total', count(*),
    'published', count(*) filter (where status = 'published'),
    'draft', count(*) filter (where status = 'draft'),
    'pending_review', count(*) filter (where status = 'pending_review'),
    'archived', count(*) filter (where status = 'archived'),
    'views', coalesce(sum(view_count), 0),
    'reviewed', count(*) filter (where reviewed_at is not null),
    'systemic', count(*) filter (where is_systemic),
    'featured', count(*) filter (where is_featured),
    'uncategorised', count(*) filter (where not exists (
      select 1 from public.symptom_categories sc where sc.symptom_id = symptoms.id
    )),
    'unique_viewers_30d', (
      select count(distinct user_id) from public.symptom_views
      where created_at >= now() - interval '30 days'
    )
  ) into v_totals
  from public.symptoms;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_view_trend
  from (
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
           count(*) as views
    from public.symptom_views
    where created_at >= now() - interval '30 days'
    group by 1 order by 1
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_body_parts
  from (
    select bp.id as body_part_id, bp.name as body_part_name, count(*) as symptom_count
    from public.symptom_body_parts sbp
    join public.body_parts bp on bp.id = sbp.body_part_id
    group by bp.id, bp.name
    order by count(*) desc
    limit 12
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_categories
  from (
    select c.id as category_id, c.name as category_name, count(*) as symptom_count
    from public.symptom_categories sc
    join public.categories c on c.id = sc.category_id
    group by c.id, c.name
    order by count(*) desc
    limit 15
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_viewed
  from (
    select id, name, coalesce(view_count, 0) as value
    from public.symptoms
    order by coalesce(view_count, 0) desc, name
    limit 10
  ) t;

  -- Completeness: heuristic — a Lexical section counts as filled when the
  -- jsonb payload is non-trivial (> 60 chars of serialised editor state).
  select jsonb_build_object(
    'avg_sections', coalesce(avg(sections), 0),
    'incomplete', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select id, name, sections
        from (
          select id, name,
            (case when about is not null and length(about::text) > 60 then 1 else 0 end
           + case when diagnosis is not null and length(diagnosis::text) > 60 then 1 else 0 end
           + case when treatment is not null and length(treatment::text) > 60 then 1 else 0 end
           + case when complications is not null and length(complications::text) > 60 then 1 else 0 end
           + case when prevention is not null and length(prevention::text) > 60 then 1 else 0 end
           + case when contact_your_doctor is not null and length(contact_your_doctor::text) > 60 then 1 else 0 end
           + case when more_information is not null and length(more_information::text) > 60 then 1 else 0 end
           + case when attribution is not null and length(attribution::text) > 60 then 1 else 0 end
            ) as sections
          from public.symptoms
          where status = 'published'
        ) scored
        where sections < 6
        order by sections asc, name
        limit 10
      ) t
    )
  ) into v_completeness
  from (
    select avg(
      case when about is not null and length(about::text) > 60 then 1 else 0 end
    + case when diagnosis is not null and length(diagnosis::text) > 60 then 1 else 0 end
    + case when treatment is not null and length(treatment::text) > 60 then 1 else 0 end
    + case when complications is not null and length(complications::text) > 60 then 1 else 0 end
    + case when prevention is not null and length(prevention::text) > 60 then 1 else 0 end
    + case when contact_your_doctor is not null and length(contact_your_doctor::text) > 60 then 1 else 0 end
    + case when more_information is not null and length(more_information::text) > 60 then 1 else 0 end
    + case when attribution is not null and length(attribution::text) > 60 then 1 else 0 end
    ) as sections
    from public.symptoms
  ) s;

  -- Engagement (likes/saves) — only when the pipeline table exists.
  if to_regclass('public.content_engagement') is not null then
    v_pipeline_live := true;

    select jsonb_build_object(
      'likes', count(*) filter (where action = 'like'),
      'saves', count(*) filter (where action = 'save'),
      'unique_engagers', count(distinct user_id)
    ) into v_engagement
    from public.content_engagement
    where content_type = 'symptom';

    execute $dyn$
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select ce.content_id as id, coalesce(s.name, 'Untitled') as name,
               count(*) as value
        from public.content_engagement ce
        left join public.symptoms s on s.id = ce.content_id
        where ce.content_type = 'symptom' and ce.action = 'like'
        group by ce.content_id, s.name
        order by count(*) desc limit 10
      ) t
    $dyn$ into v_top_liked;

    execute $dyn$
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select ce.content_id as id, coalesce(s.name, 'Untitled') as name,
               count(*) as value
        from public.content_engagement ce
        left join public.symptoms s on s.id = ce.content_id
        where ce.content_type = 'symptom' and ce.action = 'save'
        group by ce.content_id, s.name
        order by count(*) desc limit 10
      ) t
    $dyn$ into v_top_saved;
  end if;

  select jsonb_build_object(
    'totals', v_totals,
    'verification_rate', case
      when (v_totals->>'total')::int = 0 then 0
      else round(((v_totals->>'reviewed')::numeric / (v_totals->>'total')::numeric) * 100)
    end,
    'view_trend_30d', v_view_trend,
    'body_parts', v_body_parts,
    'categories', v_categories,
    'top_viewed', v_top_viewed,
    'top_liked', v_top_liked,
    'top_saved', v_top_saved,
    'engagement', v_engagement,
    'engagement_pipeline_live', v_pipeline_live,
    'completeness', v_completeness
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_symptom_analytics() from public;
grant execute on function public.get_symptom_analytics()
  to authenticated, service_role;

-- ── 8. Healthy Living analytics RPC (Phase 1) ───────────────────────────────

create or replace function public.get_healthy_living_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_totals jsonb;
  v_view_trend jsonb;
  v_categories jsonb;
  v_top_viewed jsonb;
  v_top_liked jsonb := '[]'::jsonb;
  v_top_saved jsonb := '[]'::jsonb;
  v_engagement jsonb := 'null'::jsonb;
  v_pipeline_live boolean := false;
begin
  select jsonb_build_object(
    'total', count(*),
    'published', count(*) filter (where status = 'published'),
    'draft', count(*) filter (where status = 'draft'),
    'archived', count(*) filter (where status = 'archived'),
    'views', coalesce(sum(view_count), 0),
    'featured', count(*) filter (where is_featured),
    'uncategorised', count(*) filter (where not exists (
      select 1 from public.healthy_living_categories hc
      where hc.healthy_living_id = healthy_living_info.id
    )),
    'unique_viewers_30d', (
      select count(distinct user_id) from public.healthy_living_views
      where created_at >= now() - interval '30 days'
    )
  ) into v_totals
  from public.healthy_living_info;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_view_trend
  from (
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
           count(*) as views
    from public.healthy_living_views
    where created_at >= now() - interval '30 days'
    group by 1 order by 1
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_categories
  from (
    select c.id as category_id, c.name as category_name, count(*) as article_count
    from public.healthy_living_categories hc
    join public.categories c on c.id = hc.category_id
    group by c.id, c.name
    order by count(*) desc
    limit 15
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_viewed
  from (
    select id, name, coalesce(view_count, 0) as value
    from public.healthy_living_info
    order by coalesce(view_count, 0) desc, name
    limit 10
  ) t;

  if to_regclass('public.content_engagement') is not null then
    v_pipeline_live := true;

    select jsonb_build_object(
      'likes', count(*) filter (where action = 'like'),
      'saves', count(*) filter (where action = 'save'),
      'unique_engagers', count(distinct user_id)
    ) into v_engagement
    from public.content_engagement
    where content_type = 'healthy_living';

    execute $dyn$
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select ce.content_id as id, coalesce(h.name, 'Untitled') as name,
               count(*) as value
        from public.content_engagement ce
        left join public.healthy_living_info h on h.id = ce.content_id
        where ce.content_type = 'healthy_living' and ce.action = 'like'
        group by ce.content_id, h.name
        order by count(*) desc limit 10
      ) t
    $dyn$ into v_top_liked;

    execute $dyn$
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select ce.content_id as id, coalesce(h.name, 'Untitled') as name,
               count(*) as value
        from public.content_engagement ce
        left join public.healthy_living_info h on h.id = ce.content_id
        where ce.content_type = 'healthy_living' and ce.action = 'save'
        group by ce.content_id, h.name
        order by count(*) desc limit 10
      ) t
    $dyn$ into v_top_saved;
  end if;

  select jsonb_build_object(
    'totals', v_totals,
    'view_trend_30d', v_view_trend,
    'categories', v_categories,
    'top_viewed', v_top_viewed,
    'top_liked', v_top_liked,
    'top_saved', v_top_saved,
    'engagement', v_engagement,
    'engagement_pipeline_live', v_pipeline_live
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_healthy_living_analytics() from public;
grant execute on function public.get_healthy_living_analytics()
  to authenticated, service_role;

-- ── 9. Home carousel feed (Phase 5c, Option A) ──────────────────────────────
-- Merges the three featured sets (conditions, symptoms, healthy living) for
-- the mobile home carousel. Published content only; slot order respected
-- within each type. Marketing campaigns stay on useInfiniteLiveCampaigns
-- (they need infinite paging + CTA payloads the RPC intentionally skips).

create or replace function public.get_home_carousel()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(slide order by grp, ord), '[]'::jsonb)
  from (
    select 1 as grp, coalesce(featured_order, 99) as ord,
      jsonb_build_object(
        'slide_type', 'condition',
        'id', id,
        'title', name,
        'subtitle', coalesce(specialist, ''),
        'image_url', coalesce(image_url, ''),
        'display_time', 5
      ) as slide
    from public.conditions
    where is_featured = true and status = 'published'

    union all

    select 2 as grp, coalesce(featured_order, 99) as ord,
      jsonb_build_object(
        'slide_type', 'symptom',
        'id', id,
        'title', name,
        'subtitle', coalesce(specialist, ''),
        'image_url', coalesce(image_url, ''),
        'display_time', 5
      ) as slide
    from public.symptoms
    where is_featured = true and status = 'published'

    union all

    select 3 as grp, coalesce(featured_order, 99) as ord,
      jsonb_build_object(
        'slide_type', 'healthy_living',
        'id', id,
        'title', name,
        'subtitle', coalesce(description, ''),
        'image_url', coalesce(image_url, ''),
        'display_time', 5
      ) as slide
    from public.healthy_living_info
    where is_featured = true and status = 'published'
  ) slides;
$$;

revoke all on function public.get_home_carousel() from public;
grant execute on function public.get_home_carousel()
  to authenticated, service_role;

-- ── 10. RBAC — carousel slot management keys ────────────────────────────────
-- Mirrors diseases.feature (admin + content_manager).

insert into public.admin_permissions (key, resource, action, description) values
  ('symptoms.feature', 'symptoms', 'feature', 'Feature symptoms on the home carousel'),
  ('healthyliving.feature', 'healthyliving', 'feature', 'Feature healthy living articles on the home carousel')
on conflict (key) do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'symptoms.feature'),
  ('content_manager', 'symptoms.feature'),
  ('admin', 'healthyliving.feature'),
  ('content_manager', 'healthyliving.feature')
on conflict do nothing;
