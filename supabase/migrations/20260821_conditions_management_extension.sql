-- =============================================================================
-- Diseases & Conditions management extension (Gap Analysis Part I, I-Phase 1).
--
-- Adds the mockup's classification + engagement columns to `conditions`:
--   icd11_code    - the mockup indexes the whole health database by ICD-11
--                   (I4, I-D1). Column name reused from the anatomy extension
--                   (20260820_anatomy_extension.sql) so there is one ICD field.
--   severity      - Low/Moderate/High/Critical (m-add-condition)
--   nhis_coverage - Covered/Partial/Not covered (m-add-condition)
--   like_count / save_count - counter shells (I5, I-D2): populated by the
--                   content_engagement pipeline (audit doc Part 4 / Epic 30.1);
--                   defaulted to 0 so the UI can render real columns now.
-- Carousel/review columns (featured_order, featured_from, reviewed_by) are
-- guarded with if-not-exists since the conditions table is prod-defined.
--
-- RBAC: seeds the new `diseases.export` key (I7/I8 bulk Export); `diseases.feature`
-- already exists in the catalog (lib/permissions.ts + earlier rbac seeding).
-- Additive and re-runnable.
-- =============================================================================

alter table public.conditions
  add column if not exists icd11_code text,
  add column if not exists severity text
    check (severity is null or severity in ('low', 'moderate', 'high', 'critical')),
  add column if not exists nhis_coverage text
    check (nhis_coverage is null or nhis_coverage in ('covered', 'partial', 'not_covered')),
  add column if not exists like_count integer not null default 0,
  add column if not exists save_count integer not null default 0,
  add column if not exists featured_order integer,
  add column if not exists featured_from timestamptz,
  add column if not exists reviewed_by uuid;

-- Search surface: the admin list searches by name OR ICD code.
create index if not exists idx_conditions_icd11_code
  on public.conditions (icd11_code);

-- Carousel slot management queries featured rows ordered by featured_order.
create index if not exists idx_conditions_featured_order
  on public.conditions (featured_order)
  where is_featured = true;

comment on column public.conditions.like_count is
  'Denormalised like counter; maintained by the content_engagement pipeline (Gap I5).';
comment on column public.conditions.save_count is
  'Denormalised save counter; maintained by the content_engagement pipeline (Gap I5).';

-- RBAC: CSV export of the conditions registry (admin + content_manager,
-- mirrors the other content export keys).
insert into public.admin_permissions (key, resource, action, description) values
  ('diseases.export', 'diseases', 'export', 'Export the conditions registry')
on conflict (key) do nothing;

insert into public.admin_role_permissions (role, permission_key) values
  ('admin', 'diseases.export'),
  ('content_manager', 'diseases.export')
on conflict do nothing;
