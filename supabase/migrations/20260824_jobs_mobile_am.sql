-- Gap Analysis Part AM — Jobs & Careers on the consumer mobile app (AM-D).
--
-- Schema facts verified against the live tables (Part K extension 20260821):
--   job_postings: facility_id FK, title, description, requirements text[],
--     job_type CHECK incl. locum/volunteer, specialty, salary_min/max,
--     salary_currency, location, region, status CHECK incl. pending_review,
--     minimum_qualification, min_experience_years, required_licence,
--     distance_radius_km, target_demographics, is_featured, featured_until,
--     published_at, expires_at, view_count, application_count.
--   job_applications: job_id FK, applicant_id FK, cover_letter, resume_url,
--     portfolio_url, status CHECK (pending/reviewed/shortlisted/rejected/
--     hired), reviewed_by/at, review_notes.
--   hcp_digital_cvs: user_id unique FK, specialty, qualification,
--     licence_body, employment_status CHECK, open_to_offers, documents,
--     consent (K-D3 metadata-only registry).
--
-- Adds (AM-D1..AM-D9):
--   1. Application profile columns for the 4-step wizard (HCP + non-HCP)
--   2. 'withdrawn' application status + unique(job_id, applicant_id) guard
--   3. is_boosted premium flag (AM-D7 CV Boost)
--   4. job_saved bookmarks + job_alerts subscriptions (premium)
--   5. Mobile RPCs: listings, details, apply, withdraw, my applications,
--      saved toggle, alerts upsert, open-to-offers (CV registry opt-in)
--
-- RBAC: mobile goes through the SECURITY DEFINER RPCs below; admin keeps
-- using the service-role /api/jobs routes. No direct table policies needed.

-- ── 1. Application profile columns ─────────────────────────────────────────

alter table public.job_applications
  add column if not exists applicant_type text not null default 'hcp',
  add column if not exists profession text,
  add column if not exists specialization text,
  add column if not exists years_experience_band text,
  add column if not exists highest_qualification text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists national_id text,
  add column if not exists licence_pin text,
  add column if not exists consent jsonb not null default '{}'::jsonb,
  add column if not exists is_boosted boolean not null default false;

alter table public.job_applications
  drop constraint if exists job_applications_applicant_type_check;
alter table public.job_applications
  add constraint job_applications_applicant_type_check
  check (applicant_type in ('hcp', 'non_hcp'));

-- ── 2. withdrawn status + one-application-per-job guard (AM-D6) ────────────

alter table public.job_applications
  drop constraint if exists job_applications_status_check;
alter table public.job_applications
  add constraint job_applications_status_check
  check (status in (
    'pending', 'reviewed', 'shortlisted', 'rejected', 'hired', 'withdrawn'
  ));

-- Deduplicate defensively (keep the earliest row per job+applicant) before
-- adding the unique guard so the constraint cannot fail on live data.
delete from public.job_applications a
  using public.job_applications b
 where a.job_id = b.job_id
   and a.applicant_id = b.applicant_id
   and a.ctid > b.ctid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'job_applications_job_id_applicant_id_key'
  ) then
    alter table public.job_applications
      add constraint job_applications_job_id_applicant_id_key
      unique (job_id, applicant_id);
  end if;
end;
$$;

create index if not exists idx_job_applications_applicant
  on public.job_applications (applicant_id, created_at desc);
create index if not exists idx_job_postings_mobile_board
  on public.job_postings (status, is_featured desc, published_at desc)
  where status = 'published';

comment on column public.job_applications.is_boosted is
  'Premium CV Boost (Part AM, AM-D7): boosted applications sort first in the employer applicant list.';
comment on column public.job_applications.national_id is
  'Ghana Card number collected in the application wizard; masked in all admin surfaces (extends K-D7).';

-- ── 3. Saved jobs + alert subscriptions ────────────────────────────────────

create table if not exists public.job_saved (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  job_id uuid not null references public.job_postings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(user_id) on delete cascade,
  is_active boolean not null default true,
  regions text[] not null default '{}',
  specialties text[] not null default '{}',
  job_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.job_alerts is
  'Premium job-alert preferences (Part AM, AM-D7). Matching + dispatch reuses the notification campaigns pipeline.';

-- ── 4. Mobile RPCs ─────────────────────────────────────────────────────────
-- All SECURITY DEFINER + auth-scoped; fail-open shape mirrors Part AL RPCs.

-- 4.1 Job board listing (published only, featured first).
create or replace function public.get_job_listings(
  p_search text default null,
  p_type text default null,
  p_region text default null,
  p_specialty text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  return (
    select jsonb_build_object(
      'total', count(*) over (),
      'postings', coalesce(jsonb_agg(row_data order by rank desc), '[]'::jsonb)
    )
    from (
      select
        jp.is_featured as rank,
        jsonb_build_object(
          'id', jp.id,
          'title', jp.title,
          'job_type', jp.job_type,
          'specialty', jp.specialty,
          'region', jp.region,
          'location', jp.location,
          'salary_min', jp.salary_min,
          'salary_max', jp.salary_max,
          'salary_currency', jp.salary_currency,
          'minimum_qualification', jp.minimum_qualification,
          'required_licence', jp.required_licence,
          'published_at', jp.published_at,
          'expires_at', jp.expires_at,
          'view_count', jp.view_count,
          'application_count', jp.application_count,
          'is_featured', jp.is_featured,
          'facility_name', fp.facility_name,
          'facility_type', fp.facility_type
        ) as row_data
      from public.job_postings jp
      left join public.facility_profile fp on fp.id = jp.facility_id
      where jp.status = 'published'
        and (jp.expires_at is null or jp.expires_at > now())
        and (p_type is null or jp.job_type = p_type)
        and (p_region is null or jp.region = p_region)
        and (p_specialty is null or jp.specialty ilike '%' || p_specialty || '%')
        and (p_search is null
             or jp.title ilike '%' || p_search || '%'
             or jp.description ilike '%' || p_search || '%')
      order by jp.is_featured desc, jp.published_at desc nulls last
      limit v_limit offset v_offset
    ) rows
  );
exception when others then
  return jsonb_build_object('total', 0, 'postings', '[]'::jsonb);
end;
$$;

-- 4.2 Job detail (+ caller's application status, view counter).
create or replace function public.get_job_details(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_out jsonb;
  v_status text;
begin
  update public.job_postings
     set view_count = coalesce(view_count, 0) + 1
   where id = p_id;

  select app.status into v_status
    from public.job_applications app
   where app.job_id = p_id and app.applicant_id = auth.uid()
   limit 1;

  select jsonb_build_object(
    'id', jp.id,
    'title', jp.title,
    'description', jp.description,
    'requirements', coalesce(jp.requirements, '{}'),
    'job_type', jp.job_type,
    'specialty', jp.specialty,
    'experience_level', jp.experience_level,
    'minimum_qualification', jp.minimum_qualification,
    'min_experience_years', jp.min_experience_years,
    'required_licence', jp.required_licence,
    'salary_min', jp.salary_min,
    'salary_max', jp.salary_max,
    'salary_currency', jp.salary_currency,
    'location', jp.location,
    'region', jp.region,
    'status', jp.status,
    'published_at', jp.published_at,
    'expires_at', jp.expires_at,
    'view_count', jp.view_count,
    'application_count', jp.application_count,
    'is_featured', jp.is_featured,
    'facility_name', fp.facility_name,
    'facility_type', fp.facility_type,
    'facility_region', fp.region,
    'facility_id', jp.facility_id,
    'my_application_status', v_status,
    'accepting', jp.status = 'published'
      and (jp.expires_at is null or jp.expires_at > now())
  ) into v_out
    from public.job_postings jp
    left join public.facility_profile fp on fp.id = jp.facility_id
   where jp.id = p_id;

  return coalesce(v_out, '{}'::jsonb);
exception when others then
  return '{}'::jsonb;
end;
$$;

-- 4.3 Apply (AM-D2/D4/D6): dedupe + posting-open guard, count bump.
create or replace function public.apply_to_job(
  p_job_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_app_id uuid;
  v_open boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select jp.status = 'published'
         and (jp.expires_at is null or jp.expires_at > now())
    into v_open
    from public.job_postings jp
   where jp.id = p_job_id;

  if v_open is not true then
    return jsonb_build_object('ok', false, 'error', 'posting_closed');
  end if;

  if exists (
    select 1 from public.job_applications
     where job_id = p_job_id and applicant_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  insert into public.job_applications (
    job_id, applicant_id, cover_letter, resume_url,
    applicant_type, profession, specialization, years_experience_band,
    highest_qualification, skills, languages, national_id, licence_pin,
    consent, is_boosted, status
  ) values (
    p_job_id,
    auth.uid(),
    nullif(p_payload ->> 'cover_letter', ''),
    nullif(p_payload ->> 'resume_url', ''),
    case when p_payload ->> 'applicant_type' = 'non_hcp' then 'non_hcp' else 'hcp' end,
    nullif(p_payload ->> 'profession', ''),
    nullif(p_payload ->> 'specialization', ''),
    nullif(p_payload ->> 'years_experience_band', ''),
    nullif(p_payload ->> 'highest_qualification', ''),
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'skills', '[]'::jsonb)) x),
      '{}'
    ),
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'languages', '[]'::jsonb)) x),
      '{}'
    ),
    nullif(p_payload ->> 'national_id', ''),
    nullif(p_payload ->> 'licence_pin', ''),
    coalesce(p_payload -> 'consent', '{}'::jsonb),
    coalesce((p_payload ->> 'is_boosted')::boolean, false),
    'pending'
  )
  returning id into v_app_id;

  update public.job_postings
     set application_count = coalesce(application_count, 0) + 1
   where id = p_job_id;

  return jsonb_build_object('ok', true, 'application_id', v_app_id, 'status', 'pending');
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'duplicate');
end;
$$;

-- 4.4 Withdraw while pending (AM-D6), then reapply is possible.
create or replace function public.withdraw_application(p_application_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  update public.job_applications
     set status = 'withdrawn'
   where id = p_application_id
     and applicant_id = auth.uid()
     and status = 'pending';

  if found then
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'error', 'not_withdrawable');
end;
$$;

-- 4.5 My applications tracker (AM-D1/D6).
create or replace function public.get_my_applications()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(row_data order by created desc)
    from (
      select
        app.created_at as created,
        jsonb_build_object(
          'id', app.id,
          'job_id', app.job_id,
          'status', app.status,
          'created_at', app.created_at,
          'is_boosted', app.is_boosted,
          'job_title', jp.title,
          'job_type', jp.job_type,
          'region', jp.region,
          'facility_name', fp.facility_name,
          'expires_at', jp.expires_at
        ) as row_data
      from public.job_applications app
      join public.job_postings jp on jp.id = app.job_id
      left join public.facility_profile fp on fp.id = jp.facility_id
      where app.applicant_id = auth.uid()
    ) rows
  ), '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end;
$$;

-- 4.6 Saved jobs bookmark toggle (AM-D7 free cap enforced client-side).
create or replace function public.toggle_job_saved(p_job_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'saved', false);
  end if;

  delete from public.job_saved
   where job_id = p_job_id and user_id = auth.uid();

  if found then
    return jsonb_build_object('ok', true, 'saved', false);
  end if;

  insert into public.job_saved (user_id, job_id)
  values (auth.uid(), p_job_id)
  on conflict (user_id, job_id) do nothing;

  return jsonb_build_object('ok', true, 'saved', true);
end;
$$;

create or replace function public.get_saved_jobs()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(row_data order by saved desc)
    from (
      select
        js.created_at as saved,
        jsonb_build_object(
          'job_id', js.job_id,
          'saved_at', js.created_at,
          'title', jp.title,
          'job_type', jp.job_type,
          'region', jp.region,
          'facility_name', fp.facility_name,
          'still_open', jp.status = 'published'
            and (jp.expires_at is null or jp.expires_at > now())
        ) as row_data
      from public.job_saved js
      join public.job_postings jp on jp.id = js.job_id
      left join public.facility_profile fp on fp.id = jp.facility_id
      where js.user_id = auth.uid()
    ) rows
  ), '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end;
$$;

-- 4.7 Job-alert preferences (premium; AM-D7/AM-D8).
create or replace function public.upsert_job_alert(p_prefs jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  insert into public.job_alerts (user_id, is_active, regions, specialties, job_types, updated_at)
  values (
    auth.uid(),
    coalesce((p_prefs ->> 'is_active')::boolean, true),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'regions', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'specialties', '[]'::jsonb)) x), '{}'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_prefs -> 'job_types', '[]'::jsonb)) x), '{}'),
    now()
  )
  on conflict (user_id) do update
    set is_active = excluded.is_active,
        regions = excluded.regions,
        specialties = excluded.specialties,
        job_types = excluded.job_types,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_job_alert()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_out jsonb;
begin
  select jsonb_build_object(
    'is_active', ja.is_active,
    'regions', coalesce(ja.regions, '{}'),
    'specialties', coalesce(ja.specialties, '{}'),
    'job_types', coalesce(ja.job_types, '{}')
  ) into v_out
    from public.job_alerts ja
   where ja.user_id = auth.uid();

  return coalesce(v_out, '{}'::jsonb);
end;
$$;

-- 4.8 Open-to-offers opt-in into the K-D3 digital CV registry (AM-D7).
create or replace function public.upsert_open_to_offers(p_open boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  insert into public.hcp_digital_cvs (user_id, open_to_offers, employment_status, consent, updated_at)
  values (
    auth.uid(),
    coalesce(p_open, false),
    'employed_open',
    jsonb_build_object('recruiter_visibility', coalesce(p_open, false), 'consented_at', now()),
    now()
  )
  on conflict (user_id) do update
    set open_to_offers = excluded.open_to_offers,
        consent = public.hcp_digital_cvs.consent || excluded.consent,
        updated_at = now();

  return jsonb_build_object('ok', true, 'open_to_offers', coalesce(p_open, false));
end;
$$;

-- ── 5. Grants + RLS ────────────────────────────────────────────────────────
-- Mobile uses only the SECURITY DEFINER RPCs above; admin writes go through
-- the service role. RLS on, no user policies (Part AL convention).

revoke all on function public.get_job_listings(text, text, text, text, integer, integer) from public;
grant execute on function public.get_job_listings(text, text, text, text, integer, integer) to authenticated;
revoke all on function public.get_job_details(uuid) from public;
grant execute on function public.get_job_details(uuid) to authenticated;
revoke all on function public.apply_to_job(uuid, jsonb) from public;
grant execute on function public.apply_to_job(uuid, jsonb) to authenticated;
revoke all on function public.withdraw_application(uuid) from public;
grant execute on function public.withdraw_application(uuid) to authenticated;
revoke all on function public.get_my_applications() from public;
grant execute on function public.get_my_applications() to authenticated;
revoke all on function public.toggle_job_saved(uuid) from public;
grant execute on function public.toggle_job_saved(uuid) to authenticated;
revoke all on function public.get_saved_jobs() from public;
grant execute on function public.get_saved_jobs() to authenticated;
revoke all on function public.upsert_job_alert(jsonb) from public;
grant execute on function public.upsert_job_alert(jsonb) to authenticated;
revoke all on function public.get_job_alert() from public;
grant execute on function public.get_job_alert() to authenticated;
revoke all on function public.upsert_open_to_offers(boolean) from public;
grant execute on function public.upsert_open_to_offers(boolean) to authenticated;

alter table public.job_saved enable row level security;
alter table public.job_alerts enable row level security;
