-- =============================================================================
-- Gap Analysis Part AD — Global search v2 + ghost-RPC capture + search analytics
-- =============================================================================
-- Decision points S-D2..S-D5:
--   * S-D3  global_search_v2(): SECURITY DEFINER, wildcard-safe, trigram +
--           ts_rank hybrid ranking across conditions, symptoms,
--           healthy_living_info, facility_profile (active only, no PII
--           columns) and drugs. Results capped per entity and overall.
--   * S-D4  Search analytics: every v2 search logs search_executed /
--           search_zero_results into analytics_events (vocabulary extended).
--   * S-D5  Ghost capture: global_search / admin_global_search have existed
--           live-only since before the repo — guarded CREATE (only when the
--           function is absent) so the live definitions are never replaced,
--           while a fresh DB build gets a faithful reconstruction.
--
-- Additive and re-runnable. Graceful pre-migration: mobile falls back to the
-- legacy global_search RPC until this migration is applied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Trigram support for fuzzy ranking
-- -----------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. analytics_events — ensure existence + extended event vocabulary (S-D4).
--    20260822_marketing_unification.sql owns the base table with a 5-value
--    check; this block is order-independent (runs first: creates with the
--    full vocabulary; runs second: swaps the constraint).
-- -----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  campaign_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'impression', 'click', 'install', 'signup', 'upgrade',
    'search_executed', 'search_zero_results'
  ));

create index if not exists idx_analytics_events_created
  on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;

-- -----------------------------------------------------------------------------
-- 2. global_search_v2 — mobile global search (S-D1 scope, S-D3 ranking)
-- -----------------------------------------------------------------------------
create or replace function public.global_search_v2(
  p_search_term text,
  p_result_limit int default 12
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_term text := trim(coalesce(p_search_term, ''));
  v_escaped text;
  v_limit int := least(greatest(coalesce(p_result_limit, 12), 1), 30);
  v_per_entity int := 5;
  v_results jsonb;
  v_total int;
  v_uid uuid := nullif(public.request_user_id(), '')::uuid;
begin
  if char_length(v_term) < 2 then
    return jsonb_build_object('results', '[]'::jsonb, 'total', 0);
  end if;

  -- Escape ilike wildcards so user input is matched literally (S-D hardening).
  v_escaped := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');

  with ranked as (
    -- Conditions encyclopedia
    select 'conditions'::text as entity_type, c.id::text as id,
           c.name as title, c.slug as subtitle, null::text as image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(c.name, '')), plainto_tsquery('simple', v_term)),
             similarity(c.name, v_term)
           ) as rank
    from public.conditions c
    where c.name ilike '%' || v_escaped || '%'
       or similarity(c.name, v_term) > 0.2
    union all
    -- Symptoms encyclopedia
    select 'symptoms', s.id::text, s.name, null, null,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(s.name, '')), plainto_tsquery('simple', v_term)),
             similarity(s.name, v_term)
           )
    from public.symptoms s
    where s.name ilike '%' || v_escaped || '%'
       or similarity(s.name, v_term) > 0.2
    union all
    -- Healthy Living (admin-managed table; legacy healthy_living NOT searched)
    select 'healthy_living', h.id::text, h.name, h.slug, h.image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(h.name, '')), plainto_tsquery('simple', v_term)),
             similarity(h.name, v_term)
           )
    from public.healthy_living_info h
    where (h.status is null or h.status = 'published')
      and (h.name ilike '%' || v_escaped || '%'
           or similarity(h.name, v_term) > 0.2)
    union all
    -- Facilities: active only, public fields only — never contact PII (S-D2)
    select 'facility_profile', f.id::text, f.facility_name, f.area, f.featured_image_url,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(f.facility_name, '') || ' ' || coalesce(f.area, '')),
                     plainto_tsquery('simple', v_term)),
             similarity(f.facility_name, v_term)
           )
    from public.facility_profile f
    where lower(f.status::text) = 'active'
      and (f.facility_name ilike '%' || v_escaped || '%'
           or f.area ilike '%' || v_escaped || '%'
           or similarity(f.facility_name, v_term) > 0.2)
    union all
    -- Drug catalog (Part AB) — first real consumer of the drugs table
    select 'drugs', d.id::text, d.name, d.generic_name, null,
           greatest(
             ts_rank(to_tsvector('simple', coalesce(d.name, '') || ' ' || coalesce(d.generic_name, '')),
                     plainto_tsquery('simple', v_term)),
             similarity(d.name, v_term)
           )
    from public.drugs d
    where d.name ilike '%' || v_escaped || '%'
       or coalesce(d.generic_name, '') ilike '%' || v_escaped || '%'
       or similarity(d.name, v_term) > 0.2
  ),
  capped as (
    select r.*, row_number() over (partition by entity_type order by rank desc) as rn
    from ranked r
  ),
  final as (
    select * from capped
    where rn <= v_per_entity
    order by rank desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'entity_type', entity_type, 'id', id, 'title', title,
           'subtitle', subtitle, 'image_url', image_url, 'rank', rank
         ) order by rank desc), '[]'::jsonb),
         count(*)
  into v_results, v_total
  from final;

  -- S-D4 analytics — fire inside the definer so no extra round trip.
  begin
    insert into public.analytics_events (event_type, user_id, metadata)
    values (
      case when v_total = 0 then 'search_zero_results' else 'search_executed' end,
      v_uid,
      jsonb_build_object('term', left(v_term, 120), 'result_count', v_total, 'source', 'global_search_v2')
    );
  exception when others then
    null; -- analytics must never break the search itself
  end;

  return jsonb_build_object('results', coalesce(v_results, '[]'::jsonb), 'total', coalesce(v_total, 0));
end;
$function$;

revoke all on function public.global_search_v2(text, int) from public, anon;
grant execute on function public.global_search_v2(text, int) to authenticated, service_role;

-- Trigram indexes backing the similarity() branches above.
create index if not exists idx_conditions_name_trgm on public.conditions using gin (name gin_trgm_ops);
create index if not exists idx_symptoms_name_trgm on public.symptoms using gin (name gin_trgm_ops);
create index if not exists idx_healthy_living_info_name_trgm on public.healthy_living_info using gin (name gin_trgm_ops);
create index if not exists idx_facility_profile_name_trgm on public.facility_profile using gin (facility_name gin_trgm_ops);
create index if not exists idx_drugs_name_trgm on public.drugs using gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3. Ghost capture — global_search (legacy mobile home search RPC).
--    Guarded: live DB already defines it; this only seeds a fresh build.
-- -----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'global_search'
  ) then
    create function public.global_search(p_search_term text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_term text := trim(coalesce(p_search_term, ''));
      v_escaped text;
      v_out jsonb := '[]'::jsonb;
      v_part jsonb;
    begin
      if char_length(v_term) < 2 then
        return '[]'::jsonb;
      end if;
      v_escaped := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');

      if to_regclass('public.conditions') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','conditions','id',id,'title',name,'subtitle',slug)), '[]'::jsonb)
        into v_part from public.conditions where name ilike '%' || v_escaped || '%' limit 5;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.symptoms') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','symptoms','id',id,'title',name)), '[]'::jsonb)
        into v_part from public.symptoms where name ilike '%' || v_escaped || '%' limit 5;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.healthy_living_info') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','healthy_living','id',id,'title',name,'subtitle',slug)), '[]'::jsonb)
        into v_part from public.healthy_living_info
        where (status is null or status = 'published') and name ilike '%' || v_escaped || '%' limit 5;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.facility_profile') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','facility_profile','id',id,'title',facility_name,'subtitle',area)), '[]'::jsonb)
        into v_part from public.facility_profile
        where lower(status::text) = 'active' and facility_name ilike '%' || v_escaped || '%' limit 5;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      return v_out;
    end;
    $fn$;

    revoke all on function public.global_search(text) from public, anon;
    grant execute on function public.global_search(text) to authenticated, service_role;
  end if;
end;
$do$;

-- -----------------------------------------------------------------------------
-- 4. Ghost capture — admin_global_search (admin command-palette RPC used by
--    /api/admin/search). Guarded for the same reason as above. Entity types
--    match the ENTITY_VIEW_PERMISSION map keys in app/api/admin/search.
-- -----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_global_search'
  ) then
    create function public.admin_global_search(p_search_term text, p_result_limit int default 6)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    declare
      v_term text := trim(coalesce(p_search_term, ''));
      v_escaped text;
      v_limit int := least(greatest(coalesce(p_result_limit, 6), 1), 20);
      v_out jsonb := '[]'::jsonb;
      v_part jsonb;
    begin
      if char_length(v_term) < 2 then
        return '[]'::jsonb;
      end if;
      v_escaped := replace(replace(replace(v_term, '\', '\\'), '%', '\%'), '_', '\_');

      if to_regclass('public.conditions') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','condition','id',id,'name',name)), '[]'::jsonb)
        into v_part from public.conditions where name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.symptoms') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','symptom','id',id,'name',name)), '[]'::jsonb)
        into v_part from public.symptoms where name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.facility_profile') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','facility','id',id,'name',facility_name,'subtitle',area)), '[]'::jsonb)
        into v_part from public.facility_profile where facility_name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.user_profiles') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','user','id',user_id,'name',first_name || ' ' || coalesce(last_name,''))), '[]'::jsonb)
        into v_part from public.user_profiles
        where first_name ilike '%' || v_escaped || '%' or last_name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.healthy_living_info') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','healthy_living','id',id,'name',name)), '[]'::jsonb)
        into v_part from public.healthy_living_info where name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      if to_regclass('public.fitness_exercises') is not null then
        select coalesce(jsonb_agg(jsonb_build_object('entity_type','exercise','id',id,'name',exercise_name)), '[]'::jsonb)
        into v_part from public.fitness_exercises where exercise_name ilike '%' || v_escaped || '%' limit v_limit;
        v_out := v_out || coalesce(v_part, '[]'::jsonb);
      end if;

      return v_out;
    end;
    $fn$;

    revoke all on function public.admin_global_search(text, int) from public, anon;
    grant execute on function public.admin_global_search(text, int) to authenticated, service_role;
  end if;
end;
$do$;
