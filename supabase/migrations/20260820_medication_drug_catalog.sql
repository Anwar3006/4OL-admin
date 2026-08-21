-- =============================================================================
-- Medication drug catalog (Gap Analysis Part B — B.4 schema proposal).
--
-- Builds the drug catalog that unblocks the Drug Database / Interactions /
-- AI Checker tabs, the mobile autocomplete, the unknown-drug verification
-- queue and the Excel (CSV) import pipeline.
--
-- Import decisions already resolved (B.12):
--   D1 categories collapsed to 9 buckets · D2 suspect FMCG rows excluded
--   D3 availability 'unknown' allowed · D4 autocomplete = status 'active' only
--
-- Additive and re-runnable.
-- =============================================================================

create extension if not exists pg_trgm;

-- 1. Drug catalog ------------------------------------------------------------
create table if not exists public.drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  slug text unique,
  category text,
  availability text check (availability in ('otc','rx_only','controlled','unknown')),
  dosage_form text,
  strength text,
  strength_unit text,
  pack_size int,
  manufacturer text,
  active_ingredients text[],
  conditions_treated text[],
  atc_code text,
  external_ids jsonb default '{}',
  status text default 'active'
    check (status in ('active','discontinued','under_review','unverified')),
  source text default 'admin'
    check (source in ('excel_import','admin','user_submission','api_verification')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists drugs_name_trgm_idx
  on public.drugs using gin (name gin_trgm_ops);
create index if not exists drugs_generic_trgm_idx
  on public.drugs using gin (generic_name gin_trgm_ops);
create index if not exists drugs_category_idx on public.drugs (category);
create index if not exists drugs_status_idx on public.drugs (status);

-- 2. Brand / local aliases ----------------------------------------------------
create table if not exists public.drug_aliases (
  id uuid primary key default gen_random_uuid(),
  drug_id uuid not null references public.drugs(id) on delete cascade,
  alias text not null unique,
  alias_type text default 'brand'
    check (alias_type in ('brand','generic','local','abbreviation'))
);

create index if not exists drug_aliases_trgm_idx
  on public.drug_aliases using gin (alias gin_trgm_ops);

-- 3. Interaction pairs ---------------------------------------------------------
create table if not exists public.drug_interactions (
  id uuid primary key default gen_random_uuid(),
  drug_a_id uuid not null references public.drugs(id),
  drug_b_id uuid not null references public.drugs(id),
  severity text not null check (severity in ('critical','major','moderate','minor')),
  effect text,
  recommended_action text,
  source text default 'admin',
  is_active boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (drug_a_id <> drug_b_id),
  unique (drug_a_id, drug_b_id)
);

create table if not exists public.drug_interaction_flags (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.drug_interactions(id) on delete cascade,
  user_id uuid references public.user_profiles(user_id),
  flagged_at timestamptz default now()
);

-- 4. Import bookkeeping ---------------------------------------------------------
create table if not exists public.drug_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_by uuid references public.user_profiles(user_id),
  total_rows int,
  inserted int default 0,
  updated int default 0,
  skipped_duplicates int default 0,
  failed int default 0,
  status text default 'processing' check (status in ('processing','completed','failed')),
  error_log jsonb default '[]',
  created_at timestamptz default now()
);

-- 5. Unknown-drug verification queue --------------------------------------------
create table if not exists public.drug_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(user_id),
  reminder_id uuid references public.medication_reminders(id),
  entered_name text not null,
  matched_drug_id uuid references public.drugs(id),
  auto_check_result jsonb default '{}',
  status text default 'pending'
    check (status in ('pending','auto_matched','verified','rejected')),
  verified_by uuid references public.user_profiles(user_id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- 6. Link existing tables into the catalog (nullable, backfilled post-import) ---
alter table public.medication_reminders
  add column if not exists drug_id uuid references public.drugs(id);
alter table public.medication_enquiries
  add column if not exists drug_id uuid references public.drugs(id);

-- 7. Anatomy bridge (Part A tab 5) ----------------------------------------------
create table if not exists public.drug_body_parts (
  drug_id uuid not null references public.drugs(id) on delete cascade,
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  primary key (drug_id, body_part_id)
);

-- =============================================================================
-- RLS: mobile reads active drugs only (decision D4); writes are service-role.
-- =============================================================================
alter table public.drugs enable row level security;
alter table public.drug_aliases enable row level security;
alter table public.drug_interactions enable row level security;

drop policy if exists "drugs_select_active" on public.drugs;
create policy "drugs_select_active" on public.drugs
  for select to authenticated
  using (status = 'active' or public.is_platform_admin(auth.uid()));

drop policy if exists "drugs_admin_write" on public.drugs;
create policy "drugs_admin_write" on public.drugs
  for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

drop policy if exists "drug_aliases_select" on public.drug_aliases;
create policy "drug_aliases_select" on public.drug_aliases
  for select to authenticated
  using (
    exists (select 1 from public.drugs d where d.id = drug_id and d.status = 'active')
    or public.is_platform_admin(auth.uid())
  );

drop policy if exists "drug_interactions_select" on public.drug_interactions;
create policy "drug_interactions_select" on public.drug_interactions
  for select to authenticated
  using (is_active or public.is_platform_admin(auth.uid()));

-- =============================================================================
-- RPC: mobile/admin fuzzy drug search (B.6). Active drugs only for non-admins.
-- =============================================================================
create or replace function public.search_drugs(q text, lim int default 10)
returns table (
  id uuid,
  name text,
  generic_name text,
  strength text,
  strength_unit text,
  dosage_form text,
  category text,
  availability text,
  similarity real
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  v_admin := coalesce(public.is_platform_admin(auth.uid()), false);

  return query
  select d.id, d.name, d.generic_name, d.strength, d.strength_unit,
         d.dosage_form, d.category, d.availability,
         greatest(
           similarity(d.name, q),
           similarity(coalesce(d.generic_name, ''), q)
         ) as similarity
  from public.drugs d
  where (d.status = 'active' or v_admin)
    and (
      d.name % q
      or coalesce(d.generic_name, '') % q
      or d.search_text @@ plainto_tsquery('english', q)
      or exists (
        select 1 from public.drug_aliases a
        where a.drug_id = d.id and a.alias % q
      )
    )
  order by similarity desc
  limit greatest(lim, 1);
end;
$$;

-- Text-search helper column (functional index kept out for simplicity).
alter table public.drugs add column if not exists search_text tsvector
  generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(generic_name, ''))
  ) stored;
create index if not exists drugs_search_idx on public.drugs using gin (search_text);

revoke all on function public.search_drugs(text, int) from public;
revoke all on function public.search_drugs(text, int) from anon;

-- =============================================================================
-- RPC: drug catalog KPIs for the 6-card KPI row (B.7).
-- =============================================================================
create or replace function public.get_drug_kpi_stats()
returns table (
  drugs_in_db bigint,
  drug_categories bigint,
  interaction_pairs bigint,
  interaction_flags_30d bigint,
  pending_verifications bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select count(*) from public.drugs),
    (select count(distinct category) from public.drugs where category is not null),
    (select count(*) from public.drug_interactions where is_active),
    (select count(*) from public.drug_interaction_flags
       where flagged_at >= now() - interval '30 days'),
    (select count(*) from public.drug_verification_requests
       where status = 'pending');
end;
$$;

revoke all on function public.get_drug_kpi_stats() from public;
revoke all on function public.get_drug_kpi_stats() from anon;

-- =============================================================================
-- RPC: per-drug aggregate adherence (B.7 Adherence tab).
-- =============================================================================
create or replace function public.get_drug_adherence_stats()
returns table (
  drug_name text,
  drug_id uuid,
  active_reminders bigint,
  adherence_rate numeric,
  missed_30d bigint,
  avg_doses_per_day numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with reminder_agg as (
    select
      coalesce(d.name, mr.drug_name) as drug,
      d.id as catalog_id,
      count(distinct mr.id) filter (where mr.is_enabled) as active_count,
      count(a.id) as log_count,
      count(a.id) filter (where a.status = 'taken') as taken_count,
      count(a.id) filter (
        where a.status = 'missed'
          and a.scheduled_time >= now() - interval '30 days'
      ) as missed_recent
    from public.medication_reminders mr
    left join public.drugs d on d.id = mr.drug_id
    left join public.medication_adherence a on a.reminder_id = mr.id
    group by coalesce(d.name, mr.drug_name), d.id
  )
  select
    reminder_agg.drug,
    reminder_agg.catalog_id,
    reminder_agg.active_count,
    case
      when reminder_agg.log_count = 0 then 0
      else round(100.0 * reminder_agg.taken_count / reminder_agg.log_count, 1)
    end,
    reminder_agg.missed_recent,
    case
      when reminder_agg.active_count = 0 then 0
      else round(reminder_agg.log_count::numeric / greatest(reminder_agg.active_count, 1) / 30, 1)
    end
  from reminder_agg
  order by reminder_agg.active_count desc
  limit 200;
end;
$$;

revoke all on function public.get_drug_adherence_stats() from public;
revoke all on function public.get_drug_adherence_stats() from anon;

-- ── Post-import backfill (B.5 step 6) ──────────────────────────────────────
-- Links existing free-text reminder/enquiry names into the catalog using
-- trigram similarity ≥ 0.85 against drug names and aliases. Run manually
-- after an import batch: select public.backfill_medication_drug_ids();
create or replace function public.backfill_medication_drug_ids()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminders int := 0;
  v_enquiries int := 0;
begin
  with best as (
    select distinct on (mr.id)
      mr.id as reminder_id,
      d.id as drug_id,
      greatest(
        similarity(lower(mr.drug_name), lower(d.name)),
        similarity(lower(mr.drug_name), lower(coalesce(d.generic_name, '')))
      ) as score
    from public.medication_reminders mr
    cross join lateral (
      select dd.id, dd.name, dd.generic_name
      from public.drugs dd
      where dd.status = 'active'
        and (
          dd.name % mr.drug_name
          or coalesce(dd.generic_name, '') % mr.drug_name
          or exists (
            select 1 from public.drug_aliases a
            where a.drug_id = dd.id and a.alias % mr.drug_name
          )
        )
      order by similarity(lower(mr.drug_name), lower(dd.name)) desc
      limit 1
    ) d
    where mr.drug_id is null
      and mr.drug_name is not null
      and mr.drug_name <> ''
  )
  update public.medication_reminders mr
  set drug_id = best.drug_id
  from best
  where mr.id = best.reminder_id
    and best.score >= 0.85;
  get diagnostics v_reminders = row_count;

  with best as (
    select distinct on (me.id)
      me.id as enquiry_id,
      d.id as drug_id,
      similarity(lower(me.medication_name), lower(d.name)) as score
    from public.medication_enquiries me
    cross join lateral (
      select dd.id, dd.name
      from public.drugs dd
      where dd.status = 'active' and dd.name % me.medication_name
      order by similarity(lower(me.medication_name), lower(dd.name)) desc
      limit 1
    ) d
    where me.drug_id is null
      and me.medication_name is not null
      and me.medication_name <> ''
  )
  update public.medication_enquiries me
  set drug_id = best.drug_id
  from best
  where me.id = best.enquiry_id
    and best.score >= 0.85;
  get diagnostics v_enquiries = row_count;

  return jsonb_build_object(
    'reminders_linked', v_reminders,
    'enquiries_linked', v_enquiries
  );
end;
$$;

revoke all on function public.backfill_medication_drug_ids() from public;
revoke all on function public.backfill_medication_drug_ids() from anon;
revoke all on function public.backfill_medication_drug_ids() from authenticated;

