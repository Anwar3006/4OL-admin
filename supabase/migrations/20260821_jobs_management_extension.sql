-- Gap Analysis Part K — Jobs management extension (K-Phase 1).
--
-- Schema facts verified against full-tables.sql (prod dump):
--   job_postings: facility_id FK, job_type CHECK (full_time/part_time/contract/
--   temporary/internship), status CHECK (draft/published/closed/filled/expired),
--   requirements text[], salary_min/max, published_at/expires_at, view_count,
--   application_count, created_by.
--   job_applications: job_id FK, applicant_id FK, status CHECK
--   (pending/reviewed/shortlisted/rejected/hired), reviewed_by/at, review_notes.
--
-- Adds (K6):
--   * posting metadata columns for the Post a Job form
--   * approval workflow fields (pending_review status, approved_by/at, reason)
--   * job_type CHECK rebuilt to add locum/volunteer (K-D2)
--   * status CHECK rebuilt to add pending_review (K-D2)
--   * hcp_digital_cvs — metadata-only digital CV registry (K-D3: AES vault,
--     consent infra and HSM deferred to the platform-security epic)
--
-- RBAC: jobs.view / jobs.manage already seeded (20260817_rbac_permission_catalog.sql).

alter table public.job_postings
  add column if not exists minimum_qualification text,
  add column if not exists min_experience_years integer,
  add column if not exists required_licence text,
  add column if not exists distance_radius_km integer,
  add column if not exists target_demographics jsonb not null default '[]'::jsonb,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_until timestamptz,
  add column if not exists approved_by uuid references public.user_profiles(user_id),
  add column if not exists approved_at timestamptz,
  add column if not exists posting_rejection_reason text;

-- Rebuild CHECK constraints (inline table checks auto-name to
-- {table}_{column}_check). Existing rows already satisfy the widened sets.
alter table public.job_postings
  drop constraint if exists job_postings_job_type_check;
alter table public.job_postings
  add constraint job_postings_job_type_check
  check (job_type in (
    'full_time', 'part_time', 'contract', 'temporary', 'internship',
    'locum', 'volunteer'
  ));

alter table public.job_postings
  drop constraint if exists job_postings_status_check;
alter table public.job_postings
  add constraint job_postings_status_check
  check (status in (
    'draft', 'pending_review', 'published', 'closed', 'filled', 'expired'
  ));

create index if not exists idx_job_postings_status_review
  on public.job_postings (status) where status = 'pending_review';
create index if not exists idx_job_postings_featured
  on public.job_postings (featured_until) where is_featured = true;

comment on column public.job_postings.target_demographics is
  'Array of audience tags selected in the Post a Job form (Part K).';
comment on column public.job_postings.posting_rejection_reason is
  'Reason recorded when a pending_review posting is rejected (Part K, K-D6).';

-- Digital CV registry: metadata only. Documents stay in the existing storage
-- buckets referenced by job_applications.resume_url until the vault epic.
create table if not exists public.hcp_digital_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(user_id),
  specialty text,
  qualification text,
  licence_body text,
  employment_status text
    check (employment_status in (
      'unemployed', 'employed_open', 'national_service', 'student_intern'
    )),
  open_to_offers boolean not null default false,
  documents jsonb not null default '[]'::jsonb,
  consent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hcp_digital_cvs is
  'Metadata-only digital CV registry (Part K, K-D3). Encryption-at-rest vault and consent gates are platform-security epic scope.';
