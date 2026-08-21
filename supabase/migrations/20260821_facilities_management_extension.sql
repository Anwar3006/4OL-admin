-- Gap Analysis Part H — Facilities management extension (H-Phase 1).
--
-- Schema facts verified against full-tables.sql (prod dump):
--   facility_profile already has status (facility_status_enum), is_top_rated,
--   is_featured, featured_order, submitted_by/approved_by, rejection_reason,
--   verification_documents, admin_notes, view_count, rating_average/count,
--   subscription_tier/subscription_expires_at.
--
-- Adds the mockup's missing management columns (H5, H6):
--   * hefra_registration_number — filterable HEFRA licence column (H-D2)
--   * top_rated_rank/set_by/set_at — SA-managed Top Rated leaderboard metadata
--   * feature_type/start/end + is_featured_paused — Featured tab lifecycle (H-D3)
--   * status_reason/status_changed_at — lifecycle audit trail beyond rejection_reason
-- Also lands facility_reviews.is_anonymous (H-D6): column ships now; the
-- anonymous admin review composer stays deferred pending user sign-off.
--
-- RBAC: facilities.feature already exists (20260820_rbac_catalog_extension_2.sql,
-- super_admin-only by default) — no catalog seeding required here.

alter table public.facility_profile
  add column if not exists hefra_registration_number text,
  add column if not exists top_rated_rank integer,
  add column if not exists top_rated_set_by uuid references public.user_profiles(user_id),
  add column if not exists top_rated_set_at timestamptz,
  add column if not exists feature_type text
    check (feature_type is null or feature_type in ('paid', 'admin')),
  add column if not exists feature_start timestamptz,
  add column if not exists feature_end timestamptz,
  add column if not exists is_featured_paused boolean not null default false,
  add column if not exists status_reason text,
  add column if not exists status_changed_at timestamptz;

create index if not exists idx_facility_profile_top_rated_rank
  on public.facility_profile (top_rated_rank)
  where is_top_rated = true;
create index if not exists idx_facility_profile_hefra
  on public.facility_profile (hefra_registration_number);

comment on column public.facility_profile.hefra_registration_number is
  'HEFRA registration licence number shown in the pending/review queues (Part H, H-D2).';
comment on column public.facility_profile.top_rated_rank is
  'SA-managed leaderboard position, 1-10 cap enforced server-side (Part H).';
comment on column public.facility_profile.feature_type is
  'paid = facility subscription placement, admin = editorial pick (Part H).';
comment on column public.facility_profile.status_reason is
  'Free-text reason attached to suspend/reactivate/reject lifecycle moves (Part H).';

alter table public.facility_reviews
  add column if not exists is_anonymous boolean not null default false;

comment on column public.facility_reviews.is_anonymous is
  'Reserved for admin-authored anonymous reviews (Part H, H-D6). Column landed; composer awaits sign-off.';
