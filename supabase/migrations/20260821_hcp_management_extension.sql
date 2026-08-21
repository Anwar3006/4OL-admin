-- Gap Analysis Part J — HCP management extension (J-Phase 1).
--
-- Schema facts verified against full-tables.sql (prod dump):
--   hcp_verifications has user_id NOT NULL UNIQUE -> user_profiles,
--   license_number/license_type/issuing_body (free text), license_expiry date,
--   documents jsonb, verification_status CHECK (pending/under_review/verified/
--   rejected/expired), verified_by/verified_at, rejection_reason,
--   next_verification_due.
--
-- Adds (J5):
--   * profession_type — controlled 14-value vocabulary driving the
--     Doctors / Nurses & Midwives / Pharmacists / Allied Health tab filters
--   * affiliated_facility_id FK + free-text fallback for private practice (J-D3)
--   * region (region_enum, prod type with the 16 Ghana regions)
--   * group_chat_id -> conversations for profession auto-assignment (J-D5)
--   * can_respond_enquiries — future Med Enquiry responder flag (J-D4)
--   * year_licensed
--
-- issuing_body stays free text but is documented against the five Ghanaian
-- regulatory bodies used by the mockup filters.
--
-- RBAC: hcp.create already seeded for admin in
-- 20260820_rbac_catalog_extension_2.sql — no catalog seeding required here.

alter table public.hcp_verifications
  add column if not exists profession_type text
    check (profession_type is null or profession_type in (
      'doctor', 'nurse', 'midwife', 'pharmacist', 'pharmacy_technician',
      'physician_assistant', 'medical_lab_scientist', 'radiographer',
      'physiotherapist', 'dietitian', 'optometrist', 'community_health_officer',
      'paramedic', 'dental_surgeon'
    )),
  add column if not exists affiliated_facility_id uuid
    references public.facility_profile(id),
  add column if not exists affiliated_facility_name text,
  add column if not exists region public.region_enum,
  add column if not exists group_chat_id uuid
    references public.conversations(id),
  add column if not exists can_respond_enquiries boolean not null default false,
  add column if not exists year_licensed integer;

create index if not exists idx_hcp_verifications_profession
  on public.hcp_verifications (profession_type);
create index if not exists idx_hcp_verifications_facility
  on public.hcp_verifications (affiliated_facility_id);

comment on column public.hcp_verifications.profession_type is
  'Controlled profession vocabulary (Part J, J-D1) — drives the Doctors/Nurses/Pharmacists/Allied tab filters.';
comment on column public.hcp_verifications.issuing_body is
  'Expected values: MDC, PCG, NMC, AHPC, GPC (Part J). Free text preserved for legacy rows.';
comment on column public.hcp_verifications.affiliated_facility_name is
  'Free-text fallback when no facility_profile FK applies, e.g. Private Practice (Part J, J-D3).';
comment on column public.hcp_verifications.can_respond_enquiries is
  'Opt-in flag for Medication Enquiry routing; per-HCP counters land with the Med Enquiry epic (Part J, J-D4).';
