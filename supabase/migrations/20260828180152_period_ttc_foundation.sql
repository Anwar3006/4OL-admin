-- Plasence TTC foundation: trying-to-conceive profile, ovulation tests,
-- preconception checklist, appointments, and privacy-minimized insights.
-- Additive only; existing period_daily_logs remains the source of truth for
-- BBT, cervical mucus, symptoms, mood, sex, medication, and notes.

alter table public.period_notification_preferences
  add column if not exists ovulation_test_reminders boolean not null default false,
  add column if not exists prenatal_vitamin_reminders boolean not null default false,
  add column if not exists preconception_checklist_reminders boolean not null default false;

alter table public.period_consent_events
  drop constraint if exists period_consent_events_consent_type_check;
alter table public.period_consent_events
  add constraint period_consent_events_consent_type_check
  check (consent_type in ('tracking','notifications','marketing','research_analytics','personalization'));

create table if not exists public.period_ttc_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trying_since date,
  conception_timeline text check (conception_timeline in ('soon','next_3_months','next_6_months','this_year','not_sure')),
  show_conception_language boolean not null default true,
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
  updated_at timestamptz not null default now()
);

create table if not exists public.period_ovulation_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  tested_at time,
  result text not null check (result in ('negative','low','high','peak','positive','invalid')),
  brand text,
  notes_ciphertext text,
  source text not null default 'user' check (source in ('user','device','offline_sync')),
  client_event_id text,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_period_ovulation_tests_user_date
  on public.period_ovulation_tests(user_id, logged_on desc, tested_at desc);
create unique index if not exists idx_period_ovulation_tests_client_event
  on public.period_ovulation_tests(user_id, client_event_id)
  where client_event_id is not null;

create table if not exists public.period_ttc_checklist_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  category text not null check (category in ('nutrition','clinical','lifestyle','safety','tracking')),
  source_label text,
  source_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_ttc_checklist_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid not null references public.period_ttc_checklist_items(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','planned','done','skipped')),
  target_date date,
  completed_at timestamptz,
  reminder_enabled boolean not null default false,
  notes_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, checklist_item_id)
);

create index if not exists idx_period_ttc_checklist_progress_user_status
  on public.period_ttc_checklist_progress(user_id, status, updated_at desc);

create table if not exists public.period_preconception_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_date timestamptz not null,
  timezone text not null default 'UTC',
  clinician_name text,
  purpose text not null default 'preconception_visit'
    check (purpose in ('preconception_visit','medication_review','vaccine_review','fertility_consult','other')),
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  questions text[] not null default '{}',
  notes_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_period_preconception_appointments_user_date
  on public.period_preconception_appointments(user_id, appointment_date desc);

create table if not exists public.period_fertility_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.period_cycles(id) on delete set null,
  insight_date date not null default current_date,
  insight_type text not null
    check (insight_type in ('fertile_window','ovulation_prediction','timing_suggestion','bbt_shift','irregular_cycle','preconception_next_step')),
  title text not null,
  message text not null,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  source_model text not null default 'rules-v1',
  safety_level text not null default 'informational' check (safety_level in ('informational','caution')),
  status text not null default 'active' check (status in ('active','dismissed','completed','superseded')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_period_fertility_insights_user_active
  on public.period_fertility_insights(user_id, status, insight_date desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_ttc_profiles',
    'period_ovulation_tests',
    'period_ttc_checklist_items',
    'period_ttc_checklist_progress',
    'period_preconception_appointments',
    'period_fertility_insights'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_ttc_profiles',
    'period_ovulation_tests',
    'period_ttc_checklist_progress',
    'period_preconception_appointments',
    'period_fertility_insights'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('drop policy if exists admin_access on public.%I', table_name);
    execute format(
      'create policy admin_access on public.%I for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin())',
      table_name
    );
    execute format('drop policy if exists owner_access on public.%I', table_name);
    execute format(
      'create policy owner_access on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end $$;

alter table public.period_ttc_checklist_items enable row level security;
revoke all on public.period_ttc_checklist_items from anon;
drop policy if exists admin_access on public.period_ttc_checklist_items;
create policy admin_access on public.period_ttc_checklist_items
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists active_ttc_checklist_items_read on public.period_ttc_checklist_items;
create policy active_ttc_checklist_items_read on public.period_ttc_checklist_items
  for select to authenticated using (is_active = true);

insert into public.period_ttc_checklist_items
  (code, title, description, category, source_label, source_url, display_order)
values
  ('start_prenatal_folic_acid', 'Start a prenatal vitamin', 'Consider a prenatal vitamin with folic acid before pregnancy, and confirm the right dose with a clinician.', 'nutrition', 'ACOG / CDC', 'https://www.acog.org/womens-health/faqs/good-health-before-pregnancy-prepregnancy-care', 10),
  ('book_preconception_visit', 'Book a preconception visit', 'A preconception checkup can review health history, medicines, vaccines, and pregnancy planning questions.', 'clinical', 'ACOG', 'https://www.acog.org/womens-health/faqs/good-health-before-pregnancy-prepregnancy-care', 20),
  ('review_current_medicines', 'Review medicines and supplements', 'Some medicines and supplements should be changed before pregnancy; review them with a qualified clinician.', 'clinical', 'ACOG', 'https://www.acog.org/womens-health/faqs/good-health-before-pregnancy-prepregnancy-care', 30),
  ('check_vaccines', 'Check vaccines', 'Ask whether any vaccines are recommended before pregnancy based on your history and local guidance.', 'clinical', 'ACOG', 'https://www.acog.org/womens-health/faqs/good-health-before-pregnancy-prepregnancy-care', 40),
  ('sti_screening', 'Ask about STI screening', 'Screening and treatment before pregnancy can protect you and a future pregnancy.', 'clinical', 'CDC', 'https://www.cdc.gov/pregnancy/about/index.html', 50),
  ('chronic_condition_plan', 'Review chronic conditions', 'If you manage a chronic condition, make a pregnancy-safe care plan with your clinician.', 'clinical', 'ACOG', 'https://www.acog.org/womens-health/faqs/good-health-before-pregnancy-prepregnancy-care', 60),
  ('avoid_alcohol_smoking_drugs', 'Avoid alcohol, smoking, and drugs', 'Avoid substances that can affect fertility or a future pregnancy; ask for support if stopping is hard.', 'safety', 'CDC', 'https://www.cdc.gov/pregnancy/about/index.html', 70),
  ('healthy_weight_nutrition', 'Support nutrition and healthy weight', 'Focus on sustainable nutrition, movement, sleep, and health goals rather than quick fixes.', 'lifestyle', 'Mayo Clinic', 'https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant', 80),
  ('track_fertile_signs', 'Track fertile signs', 'Log period dates, cervical mucus, BBT, and ovulation tests to make predictions more useful over time.', 'tracking', 'Mayo Clinic', 'https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/expert-answers/ovulation-signs/faq-20058000', 90),
  ('know_when_to_seek_help', 'Know when to seek help', 'If pregnancy is not happening after months of trying, age and health history can change when to ask for fertility guidance.', 'clinical', 'ACOG', 'https://www.acog.org/womens-health/faqs/evaluating-infertility', 100)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();

insert into public.period_feature_flags(key, description, enabled, rollout_percent)
values
  ('ttc_mode_v1', 'Trying-to-conceive profile, checklist, ovulation tests, and fertility insights for Plasence.', false, 0)
on conflict (key) do nothing;

comment on table public.period_ttc_profiles is 'Trying-to-conceive preferences and preconception readiness state. Do not present as diagnosis or pregnancy confirmation.';
comment on table public.period_ovulation_tests is 'User-entered ovulation predictor kit results for TTC mode; useful as a tracking signal, not a medical determination.';
comment on table public.period_ttc_checklist_items is 'Clinically conservative preconception checklist templates managed by admins.';
comment on table public.period_ttc_checklist_progress is 'Per-user progress against TTC checklist templates. Private notes are application-encrypted.';
comment on table public.period_fertility_insights is 'Non-diagnostic TTC insight cards generated from user-owned period and fertility signals.';
comment on column public.period_ttc_profiles.notes_ciphertext is 'Application-encrypted free text. Never return raw text in admin list endpoints.';
comment on column public.period_ovulation_tests.notes_ciphertext is 'Application-encrypted free text. Never return raw text in admin list endpoints.';
comment on column public.period_ttc_checklist_progress.notes_ciphertext is 'Application-encrypted free text. Never return raw text in admin list endpoints.';
comment on column public.period_preconception_appointments.notes_ciphertext is 'Application-encrypted free text. Never return raw text in admin list endpoints.';
