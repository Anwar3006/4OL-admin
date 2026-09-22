-- =============================================================================
-- P0-10 step 1: provider_kind enum + the four admin-managed lookup tables
-- (provider_types, capabilities, credential_types, provider_type_requirements),
-- seeded from the brief's "Data model -> Schema draft" and PLAN.md's exact
-- seed lists.
--
-- These are pure additions — nothing references providers/facility_profile
-- yet, so this migration is safe to run before the rename. Seeded `grants`
-- and `provider_type_requirements` are a defensible first pass, not a
-- regulatory fact-check: admins can edit every row here later (Settings ->
-- Provider types / Credential types / Capabilities, P0-14) without another
-- migration. Ambulance's basic_life_support / advanced_life_support have no
-- seeded credential grant yet — PLAN.md's credential_types list has no
-- paramedic-certificate type (Phase 3 territory) — so those two stay
-- admin_override-only until one is added.
-- =============================================================================

create type public.provider_kind as enum
  ('care_facility','vendor','practitioner','trainer','ambulance_operator');

create table public.provider_types (
  key text primary key,
  kind public.provider_kind not null,
  label text not null,
  directory_category text,
  icon text,
  is_listed boolean not null default true,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.capabilities (
  key text primary key,
  label text not null,
  applies_to public.provider_kind[] not null,
  requires_item_review boolean not null default true,
  description text
);

create table public.credential_types (
  key text primary key,
  regulator text not null,
  label text not null,
  applies_to public.provider_kind[] not null,
  has_expiry boolean not null default true,
  grants text[] not null default '{}'
);

create table public.provider_type_requirements (
  provider_type text references public.provider_types(key) on delete cascade,
  credential_type text references public.credential_types(key) on delete cascade,
  required_for_activation boolean not null default true,
  primary key (provider_type, credential_type)
);

-- Everyone can read these (they only drive filters/labels/checklists);
-- only admins manage them.
alter table public.provider_types enable row level security;
alter table public.capabilities enable row level security;
alter table public.credential_types enable row level security;
alter table public.provider_type_requirements enable row level security;

create policy "provider_types read all" on public.provider_types
  for select to anon, authenticated using (true);
create policy "provider_types admin write" on public.provider_types
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

create policy "capabilities read all" on public.capabilities
  for select to anon, authenticated using (true);
create policy "capabilities admin write" on public.capabilities
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

create policy "credential_types read all" on public.credential_types
  for select to anon, authenticated using (true);
create policy "credential_types admin write" on public.credential_types
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

create policy "provider_type_requirements read all" on public.provider_type_requirements
  for select to anon, authenticated using (true);
create policy "provider_type_requirements admin write" on public.provider_type_requirements
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

grant select on public.provider_types, public.capabilities, public.credential_types, public.provider_type_requirements
  to anon, authenticated;
grant all on public.provider_types, public.capabilities, public.credential_types, public.provider_type_requirements
  to service_role;

-- -----------------------------------------------------------------------------
-- Seed: provider_types
-- -----------------------------------------------------------------------------
insert into public.provider_types (key, kind, label, sort_order) values
  ('hospital_clinic',   'care_facility', 'Hospital / Clinic', 10),
  ('dental_clinic',     'care_facility', 'Dental Clinic', 20),
  ('eye_clinic',        'care_facility', 'Eye Clinic', 30),
  ('physio_centre',     'care_facility', 'Physiotherapy Centre', 40),
  ('osteopathy_centre', 'care_facility', 'Osteopathy Centre', 50),
  ('prosthetics_centre','care_facility', 'Prosthetics Centre', 60),
  ('psychiatric_centre','care_facility', 'Psychiatric Centre', 70),
  ('care_home',         'care_facility', 'Care Home', 80),
  ('maternity_home',    'care_facility', 'Maternity Home', 90),
  ('diagnostic_lab',    'care_facility', 'Diagnostic Lab', 100),
  ('imaging_centre',    'care_facility', 'Imaging Centre', 110),
  ('health_school',     'care_facility', 'Health School', 120),
  ('herbal_centre',     'care_facility', 'Herbal Centre', 130),

  ('pharmacy',             'vendor', 'Pharmacy', 200),
  ('otc_medicine_seller',  'vendor', 'OTC Medicine Seller', 210),
  ('supplement_shop',      'vendor', 'Supplement Shop', 220),
  ('healthy_food_shop',    'vendor', 'Healthy Food Shop', 230),
  ('herbal_product_seller','vendor', 'Herbal Product Seller', 240),
  ('wholesaler',           'vendor', 'Wholesaler', 250),
  ('medical_supplier',     'vendor', 'Medical Supplier', 260),

  ('doctor',          'practitioner', 'Doctor', 300),
  ('nurse_midwife',   'practitioner', 'Nurse / Midwife', 310),
  ('physiotherapist', 'practitioner', 'Physiotherapist', 320),
  ('dietitian',       'practitioner', 'Dietitian', 330),
  ('optometrist',     'practitioner', 'Optometrist', 340),
  ('counsellor',      'practitioner', 'Counsellor', 350),

  ('personal_trainer', 'trainer', 'Personal Trainer', 400),
  ('gym',              'trainer', 'Gym', 410),
  ('event_organiser',  'trainer', 'Event Organiser', 420),

  ('ambulance_service','ambulance_operator', 'Ambulance Service', 500)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Seed: capabilities
-- -----------------------------------------------------------------------------
insert into public.capabilities (key, label, applies_to, description) values
  ('rx_medicines',    'Prescription medicines', '{vendor}', 'Sell prescription-only medicines (gated by the rx_epharmacy flag)'),
  ('otc_medicines',   'OTC medicines',          '{vendor}', 'Sell over-the-counter medicines'),
  ('supplements',     'Supplements',            '{vendor}', 'Sell supplements'),
  ('herbal_products', 'Herbal products',        '{vendor}', 'Sell herbal products'),
  ('healthy_foods',   'Healthy foods',          '{vendor}', 'Sell healthy / natural foods (seeds, nuts, teas)'),
  ('medical_devices', 'Medical devices',        '{vendor}', 'Sell medical devices and equipment'),
  ('wholesale',       'Wholesale',              '{vendor}', 'Sell at wholesale volume/pricing'),

  ('bed_tracking',    'Bed tracking',    '{care_facility}', 'Runs the bed tracker for its wards'),
  ('lab_tests',       'Lab tests',       '{care_facility}', 'Offers diagnostic lab tests'),
  ('imaging',         'Imaging',         '{care_facility}', 'Offers imaging (X-ray, ultrasound, scans)'),
  ('maternity',       'Maternity',       '{care_facility}', 'Offers maternity services'),
  ('nhis_accredited', 'NHIS accredited', '{care_facility}', 'Accepts NHIS'),

  ('prescribe',        'Can prescribe',       '{practitioner}', 'Licensed to prescribe medicines'),
  ('video_consult',    'Video consultations', '{practitioner}', 'Offers video consultations'),
  ('home_visits',      'Home visits',         '{practitioner}', 'Offers home visits'),
  ('answer_enquiries', 'Answers enquiries',   '{practitioner}', 'Can respond to patient enquiries'),

  ('group_classes',   'Group classes',   '{trainer}', 'Runs group fitness classes'),
  ('outdoor_events',  'Outdoor events',  '{trainer}', 'Organises outdoor events'),
  ('sell_programmes', 'Sell programmes', '{trainer}', 'Sells fitness programmes'),

  ('basic_life_support',    'Basic life support',    '{ambulance_operator}', 'BLS-equipped crew'),
  ('advanced_life_support', 'Advanced life support', '{ambulance_operator}', 'ALS-equipped crew')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Seed: credential_types
-- -----------------------------------------------------------------------------
insert into public.credential_types (key, regulator, label, applies_to, has_expiry, grants) values
  ('hefra_facility_licence', 'HeFRA', 'HeFRA facility licence', '{care_facility,ambulance_operator}', true, '{bed_tracking,maternity}'),
  ('pcg_premises_licence',   'PCG',   'Pharmacy Council premises licence', '{vendor}', true, '{otc_medicines}'),
  ('pcg_epharmacy_reg',      'PCG',   'Pharmacy Council e-pharmacy registration', '{vendor}', true, '{rx_medicines}'),
  ('pcg_chemical_seller_licence', 'PCG', 'Chemical seller licence', '{vendor}', true, '{otc_medicines}'),
  ('pcg_wholesale_licence',  'PCG',   'Pharmacy Council wholesale licence', '{vendor}', true, '{wholesale}'),
  ('fda_product_reg',        'FDA',   'FDA product registration', '{vendor}', true, '{supplements,herbal_products,healthy_foods}'),
  ('fda_device_reg',         'FDA',   'FDA device registration', '{vendor,care_facility}', true, '{medical_devices}'),
  ('mdc_reg',                'MDC',   'Medical & Dental Council registration', '{practitioner}', true, '{prescribe,video_consult,home_visits,answer_enquiries}'),
  ('nmc_reg',                'NMC',   'Nursing & Midwifery Council registration', '{practitioner}', true, '{video_consult,home_visits,answer_enquiries}'),
  ('ahpc_reg',               'AHPC',  'Allied Health Professions Council registration', '{care_facility,practitioner}', true, '{lab_tests,imaging}'),
  ('gpc_reg',                'GPC',   'Ghana Psychology Council registration', '{practitioner}', true, '{video_consult,answer_enquiries}'),
  ('tmpc_licence',           'TMPC',  'Traditional Medicine Practice Council licence', '{care_facility,vendor}', true, '{herbal_products}'),
  ('nhia_accreditation',     'NHIA',  'NHIA accreditation', '{care_facility}', true, '{nhis_accredited}'),
  ('business_reg',           'ORC',   'Business registration', '{care_facility,vendor,practitioner,trainer,ambulance_operator}', true, '{}'),
  ('trainer_cert',           'admin-checked', 'Trainer certificate', '{trainer}', false, '{group_classes,outdoor_events,sell_programmes}')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Seed: provider_type_requirements (required_for_activation unless noted)
-- -----------------------------------------------------------------------------
insert into public.provider_type_requirements (provider_type, credential_type, required_for_activation) values
  ('hospital_clinic','hefra_facility_licence', true), ('hospital_clinic','business_reg', true),
  ('dental_clinic','hefra_facility_licence', true),   ('dental_clinic','business_reg', true),
  ('eye_clinic','hefra_facility_licence', true),      ('eye_clinic','business_reg', true),
  ('physio_centre','hefra_facility_licence', true),   ('physio_centre','business_reg', true),
  ('osteopathy_centre','hefra_facility_licence', true), ('osteopathy_centre','business_reg', true),
  ('prosthetics_centre','hefra_facility_licence', true), ('prosthetics_centre','business_reg', true),
  ('psychiatric_centre','hefra_facility_licence', true), ('psychiatric_centre','business_reg', true),
  ('care_home','hefra_facility_licence', true),       ('care_home','business_reg', true),
  ('maternity_home','hefra_facility_licence', true),  ('maternity_home','business_reg', true),
  ('diagnostic_lab','hefra_facility_licence', true),  ('diagnostic_lab','business_reg', true),
  ('imaging_centre','hefra_facility_licence', true),  ('imaging_centre','business_reg', true),
  ('health_school','hefra_facility_licence', true),   ('health_school','business_reg', true),
  ('herbal_centre','hefra_facility_licence', true),   ('herbal_centre','tmpc_licence', true), ('herbal_centre','business_reg', true),

  ('pharmacy','pcg_premises_licence', true), ('pharmacy','business_reg', true), ('pharmacy','pcg_epharmacy_reg', false),
  ('otc_medicine_seller','pcg_chemical_seller_licence', true), ('otc_medicine_seller','business_reg', true),
  ('supplement_shop','fda_product_reg', true), ('supplement_shop','business_reg', true),
  ('healthy_food_shop','fda_product_reg', true), ('healthy_food_shop','business_reg', true),
  ('herbal_product_seller','fda_product_reg', true), ('herbal_product_seller','business_reg', true), ('herbal_product_seller','tmpc_licence', false),
  ('wholesaler','pcg_wholesale_licence', true), ('wholesaler','business_reg', true),
  ('medical_supplier','fda_device_reg', true), ('medical_supplier','business_reg', true),

  ('doctor','mdc_reg', true),
  ('nurse_midwife','nmc_reg', true),
  ('physiotherapist','ahpc_reg', true),
  ('dietitian','ahpc_reg', true),
  ('optometrist','ahpc_reg', true),
  ('counsellor','gpc_reg', true),

  ('personal_trainer','trainer_cert', true),
  ('gym','trainer_cert', true),
  ('event_organiser','trainer_cert', true),

  ('ambulance_service','hefra_facility_licence', true), ('ambulance_service','business_reg', true)
on conflict (provider_type, credential_type) do nothing;
