-- TTC & Fertility foundation (TTC_PLAN.md, Batch 1 server records +
-- Batch 4 admin analytics wiring).
--
-- The six period_ttc_* tables hold the "Trying to Get Pregnant" journey.
-- Privacy rules (TTC_PLAN.md, Admin Principles):
--   * admin analytics only ever see aggregates or masked metadata;
--   * intimate notes stay client-encrypted (notes_ciphertext) and are never
--     decrypted server-side;
--   * sexual-activity detail stays in period_daily_logs and is NOT repeated
--     here;
--   * medical copy must stay educational and non-diagnostic ("likely",
--     "estimated", "may").

-- ─── 1. TTC profile (one per user) ──────────────────────────────────────────
create table if not exists public.period_ttc_profiles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trying_since date,
  conception_timeline text
    check (conception_timeline in ('soon','next_3_months','next_6_months','this_year','not_sure')),
  show_conception_language boolean not null default false,
  partner_involved boolean,
  prenatal_vitamin_started_on date,
  preconception_visit_status text not null default 'not_started'
    check (preconception_visit_status in ('not_started','planned','completed','not_applicable')),
  preconception_visit_date date,
  medication_review_status text not null default 'not_started'
    check (medication_review_status in ('not_started','planned','completed','not_applicable')),
  vaccine_review_status text not null default 'not_started'
    check (vaccine_review_status in ('not_started','planned','completed','not_applicable')),
  chronic_condition_review_status text not null default 'not_started'
    check (chronic_condition_review_status in ('not_started','planned','completed','not_applicable')),
  sti_screening_status text not null default 'not_started'
    check (sti_screening_status in ('not_started','planned','completed','not_applicable')),
  dental_check_status text not null default 'not_started'
    check (dental_check_status in ('not_started','planned','completed','not_applicable')),
  lifestyle_focus_areas text[] not null default '{}',
  notes_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_ttc_profiles_pkey primary key (id),
  constraint period_ttc_profiles_one_per_user unique (user_id)
);

-- ─── 2. Ovulation predictor kit results ─────────────────────────────────────
create table if not exists public.period_ovulation_tests (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  tested_at timestamptz,
  result text not null
    check (result in ('negative','low','high','peak','positive','invalid')),
  brand text,
  notes_ciphertext text,
  source text not null default 'user'
    check (source in ('user','device','offline_sync')),
  client_event_id text,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_ovulation_tests_pkey primary key (id)
);

-- Idempotent offline syncs: a retried client event must not duplicate rows.
create unique index if not exists period_ovulation_tests_client_event_unique
  on public.period_ovulation_tests (user_id, client_event_id)
  where client_event_id is not null;
create index if not exists idx_period_ovulation_tests_user_logged
  on public.period_ovulation_tests (user_id, logged_on desc);

-- ─── 3. Admin-managed preconception checklist template ──────────────────────
create table if not exists public.period_ttc_checklist_items (
  id uuid not null default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  category text not null default 'clinical'
    check (category in ('nutrition','clinical','lifestyle','safety','tracking')),
  source_label text,
  source_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_ttc_checklist_items_pkey primary key (id),
  constraint period_ttc_checklist_items_code_unique unique (code)
);

-- ─── 4. Per-user checklist progress ─────────────────────────────────────────
create table if not exists public.period_ttc_checklist_progress (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid not null references public.period_ttc_checklist_items(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','planned','done','skipped')),
  target_date date,
  completed_at timestamptz,
  reminder_enabled boolean not null default false,
  notes_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_ttc_checklist_progress_pkey primary key (id),
  constraint period_ttc_checklist_progress_unique unique (user_id, checklist_item_id)
);

-- ─── 5. Preconception clinical appointments ────────────────────────────────
create table if not exists public.period_preconception_appointments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_date date not null,
  timezone text not null default 'Africa/Accra',
  clinician_name text,
  purpose text not null default 'preconception_visit'
    check (purpose in ('preconception_visit','medication_review','vaccine_review','fertility_consult','other')),
  status text not null default 'planned'
    check (status in ('planned','completed','cancelled')),
  questions text[] not null default '{}',
  notes_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_preconception_appointments_pkey primary key (id)
);

create index if not exists idx_period_preconception_appointments_user
  on public.period_preconception_appointments (user_id, appointment_date desc);

-- ─── 6. Non-diagnostic fertility insight cards ──────────────────────────────
create table if not exists public.period_fertility_insights (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid,
  insight_date date not null,
  insight_type text not null
    check (insight_type in ('fertile_window','ovulation_prediction','timing_suggestion','bbt_shift','irregular_cycle','preconception_next_step')),
  title text not null,
  message text not null,
  confidence numeric(4,3),
  evidence jsonb not null default '{}'::jsonb,
  source_model text not null default 'rule_v1',
  safety_level text not null default 'informational'
    check (safety_level in ('informational','caution')),
  status text not null default 'active'
    check (status in ('active','dismissed','completed','superseded')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_fertility_insights_pkey primary key (id)
);

create index if not exists idx_period_fertility_insights_user_date
  on public.period_fertility_insights (user_id, insight_date desc);

-- ─── RLS: owner access for users, admin_access for the panel ────────────────
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_ttc_profiles','period_ovulation_tests','period_ttc_checklist_items',
    'period_ttc_checklist_progress','period_preconception_appointments','period_fertility_insights'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('drop policy if exists admin_access on public.%I', table_name);
    execute format(
      'create policy admin_access on public.%I for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())',
      table_name
    );
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_ttc_profiles','period_ovulation_tests','period_ttc_checklist_progress',
    'period_preconception_appointments','period_fertility_insights'
  ] loop
    execute format('drop policy if exists owner_access on public.%I', table_name);
    execute format(
      'create policy owner_access on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end $$;

-- Mobile clients read the ACTIVE checklist template; they never write to it.
drop policy if exists active_period_ttc_checklist_items_read on public.period_ttc_checklist_items;
create policy active_period_ttc_checklist_items_read on public.period_ttc_checklist_items
  for select to authenticated using (is_active = true);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_ttc_profiles','period_ovulation_tests','period_ttc_checklist_items',
    'period_ttc_checklist_progress','period_preconception_appointments','period_fertility_insights'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

-- ─── Seed: conservative preconception checklist (ACOG/CDC/Mayo guidance) ────
-- Educational only; never diagnostic. Source labels recorded for clinical
-- review traceability.
insert into public.period_ttc_checklist_items
  (code, title, description, category, source_label, display_order)
values
  ('prenatal_vitamin', 'Start a prenatal vitamin',
   'Folic acid before conception may help reduce the risk of some birth defects. A clinician or pharmacist can suggest an option that suits you.',
   'nutrition', 'ACOG preconception guidance', 1),
  ('preconception_visit', 'Book a preconception visit',
   'A check-up before pregnancy is a chance to review your health history, medications and questions with a qualified clinician.',
   'clinical', 'CDC preconception care', 2),
  ('medication_review', 'Review your medications',
   'Some prescription and over-the-counter medicines may not be suitable in pregnancy. Ask a clinician before stopping or changing any medication.',
   'clinical', 'Mayo Clinic preconception guidance', 3),
  ('vaccine_review', 'Check your vaccinations',
   'Being up to date on recommended vaccines before pregnancy may protect you and a future pregnancy.',
   'clinical', 'CDC preconception care', 4),
  ('sti_screening', 'Consider STI screening',
   'Some infections can affect fertility or pregnancy without symptoms. Screening is a routine, judgement-free part of preconception care.',
   'clinical', 'CDC preconception care', 5),
  ('chronic_condition_review', 'Plan around chronic conditions',
   'Conditions like diabetes, hypertension or thyroid disease deserve a care plan before conception. A clinician can help you prepare.',
   'clinical', 'ACOG preconception guidance', 6),
  ('dental_check', 'Schedule a dental check',
   'Gum health is linked to overall health in pregnancy. A dental check before conceiving is a simple, useful step.',
   'clinical', 'Mayo Clinic preconception guidance', 7),
  ('lifestyle_support', 'Support healthy habits',
   'Balanced meals, regular movement, enough sleep and avoiding smoking and alcohol may support fertility. Small steady steps count.',
   'lifestyle', 'ACOG preconception guidance', 8)
on conflict (code) do nothing;
