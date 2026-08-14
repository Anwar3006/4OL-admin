-- Period Tracker: full schema (Plasence Library, Friday Trivia, AI content
-- curation, forecasting, safety/consent/privacy workflows).
--
-- Reconciled from codex/period-library-admin-snapshot
-- (supabase/migrations/20260813_admin_platform_parity.sql +
-- 20260813_period_tracker_operations.sql), commit 9d7ccae. That branch is
-- 407 commits behind current main and 388 ahead — its own tracking doc
-- (codex/period-library-admin-integration's TASKS.md addition, PTI-002/
-- PTI-003) explicitly says it is "not a branch to merge wholesale" and
-- flags real schema conflicts with main's current tables. This migration
-- is NOT a raw copy of those files — it's the period-specific subset,
-- reconciled:
--
--   - Skipped entirely: admin_permissions / admin_role_permissions (both
--     the tables and every seed INSERT into them) — this granular
--     permission-table system doesn't exist on main and nothing in the
--     live app enforces it; main's real, current, audited permission
--     model is the flat `user_profiles.role` check via is_app_admin().
--     Building it now for a feature that would be its only consumer is
--     exactly the "speculative infrastructure" this backlog has
--     deliberately avoided everywhere else.
--   - Skipped entirely: every non-period table from the parity migration
--     (admin_sessions, admin_activity_logs, admin_tasks,
--     notification_campaigns, security_threats, transactions, refunds,
--     job_postings, etc.) — these all either already exist live with a
--     different, real, currently-used schema (built/audited in Epics
--     11/22/27/28 this session), or belong to other deferred epics
--     entirely. Applying the snapshot's versions would have silently
--     no-op'd (CREATE TABLE IF NOT EXISTS) while the ported application
--     code expected the snapshot's field names — an immediate runtime
--     break, not a merge.
--   - `is_4ol_admin()` replaced with `is_app_admin()` throughout (the
--     function that actually exists on main; same role check).
--   - Added `touch_updated_at()` — a generic updated_at trigger function
--     the snapshot's own `do $$ ... $$` loops call by name but never
--     define in the reconciled subset (it lived alongside the
--     non-period tables' own migration ordering in the original branch).
--
-- Everything else below (tables, types, RLS, RPCs, real
-- auth.uid()/user_profiles.role checks already present in
-- review_period_cycle_revision/review_period_trivia_event/
-- submit_period_trivia) is preserved as originally written — those RPCs
-- already had real authorization checks and correct service_role-only
-- grants before this reconciliation, unlike several other functions
-- found during this session's audit.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Base period tables (from the parity migration's period-specific section)
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.period_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start_date date not null,
  period_end_date date,
  cycle_length smallint check(cycle_length between 15 and 60),
  period_length smallint check(period_length between 1 and 14),
  next_period_forecast date,
  ovulation_forecast date,
  fertile_window daterange,
  current_phase text,
  mood text,
  symptoms text[] not null default '{}',
  source text not null default 'user' check(source in ('user','admin','migration','device')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, period_start_date)
);

create index if not exists idx_period_cycles_user_start on public.period_cycles(user_id, period_start_date desc);

create table if not exists public.period_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.period_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  symptom text not null,
  severity smallint check(severity between 1 and 5),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.period_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.period_cycles(id) on delete cascade,
  category text not null,
  note_ciphertext text not null,
  flagged_at timestamptz,
  flag_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check(consent_type in ('tracking','notifications','marketing','research_analytics')),
  granted boolean not null,
  policy_version text not null,
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.period_content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text not null,
  body_html text not null,
  status text not null default 'draft' check(status in ('draft','review','published','archived')),
  reads bigint not null default 0 check(reads >= 0),
  helpful_count bigint not null default 0 check(helpful_count >= 0),
  not_helpful_count bigint not null default 0 check(not_helpful_count >= 0),
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text not null,
  target_definition jsonb not null default '{}'::jsonb,
  partner_name text,
  reached_count bigint not null default 0,
  opened_count bigint not null default 0,
  action_count bigint not null default 0,
  status text not null default 'draft' check(status in ('draft','scheduled','running','paused','completed','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_ai_model_metrics (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  metric_date date not null,
  notification_type text not null,
  recipient_count bigint not null default 0,
  opened_count bigint not null default 0,
  action_count bigint not null default 0,
  status text not null default 'active' check(status in ('testing','active','paused','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(model_key, metric_date, notification_type)
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_cycles','period_notes','period_content','period_campaigns'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Period Tracker operations: daily logs, forecasting, safety flags, notes
-- review queue, notification preferences, library, trivia, AI content
-- curation, consent/privacy. (from the operations migration, reconciled
-- per the header comment above)
-- ─────────────────────────────────────────────────────────────────────────

-- Plasence / 4OL Period Tracker operational contract.
-- This migration is additive so the existing cycle records remain valid while
-- clients move from cycle-level symptom arrays to one daily source of truth.

create table if not exists public.period_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tracking_goal text not null default 'track_period' check(tracking_goal in ('track_period','trying_to_conceive','pregnancy','pcos_support')),
  typical_cycle_length smallint check(typical_cycle_length between 15 and 60),
  typical_period_length smallint check(typical_period_length between 1 and 14),
  timezone text not null default 'UTC',
  locale text not null default 'en',
  onboarding_version text,
  onboarding_completed_at timestamptz,
  reminders_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.period_cycles(id) on delete set null,
  logged_on date not null,
  flow text check(flow in ('none','spotting','light','medium','heavy')),
  moods text[] not null default '{}',
  symptoms jsonb not null default '[]'::jsonb,
  basal_body_temperature numeric(4,2),
  temperature_unit text check(temperature_unit in ('c','f')),
  cervical_mucus text check(cervical_mucus in ('dry','sticky','creamy','watery','egg_white','other')),
  sexual_activity text check(sexual_activity in ('none','protected','unprotected','prefer_not_to_say')),
  exercise_minutes smallint check(exercise_minutes between 0 and 1440),
  medication_logged boolean not null default false,
  note_ciphertext text,
  note_category text,
  source text not null default 'user' check(source in ('user','admin','migration','device','offline_sync')),
  client_event_id text,
  app_version text,
  sync_status text not null default 'synced' check(sync_status in ('local','queued','synced','conflict','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, logged_on)
);

create index if not exists idx_period_daily_logs_user_date on public.period_daily_logs(user_id, logged_on desc);
create index if not exists idx_period_daily_logs_sync on public.period_daily_logs(sync_status, updated_at desc);
create unique index if not exists idx_period_daily_logs_client_event on public.period_daily_logs(user_id, client_event_id) where client_event_id is not null;

create table if not exists public.period_cycle_revisions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.period_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reason text not null,
  before_values jsonb not null,
  proposed_values jsonb not null,
  forecast_impact jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.period_cycles(id) on delete set null,
  model_key text not null,
  model_version text not null,
  input_window_start date,
  input_window_end date,
  predicted_period_start date not null,
  predicted_ovulation_date date,
  fertile_window daterange,
  confidence numeric(5,4) check(confidence between 0 and 1),
  explanation_code text,
  generated_at timestamptz not null default now(),
  confirmed_period_start date,
  absolute_error_days smallint check(absolute_error_days >= 0),
  superseded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_period_forecasts_user_generated on public.period_forecasts(user_id, generated_at desc);
create index if not exists idx_period_forecasts_model on public.period_forecasts(model_key, model_version, generated_at desc);

create table if not exists public.period_safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_log_id uuid references public.period_daily_logs(id) on delete set null,
  cycle_id uuid references public.period_cycles(id) on delete set null,
  flag_type text not null,
  severity text not null check(severity in ('low','medium','high','urgent')),
  rule_version text not null,
  trigger_summary text not null,
  status text not null default 'open' check(status in ('open','in_review','escalated','resolved','dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution_code text,
  resolution_note text,
  due_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_period_safety_queue on public.period_safety_flags(status, severity, due_at);

alter table public.period_notes add column if not exists review_status text not null default 'unreviewed'
  check(review_status in ('unreviewed','in_review','cleared','escalated'));
alter table public.period_notes add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.period_notes add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.period_notes add column if not exists reviewed_at timestamptz;
alter table public.period_notes add column if not exists resolution_code text;
create index if not exists idx_period_notes_review_queue on public.period_notes(review_status, flagged_at desc);

create table if not exists public.period_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period_reminders boolean not null default false,
  fertile_window_reminders boolean not null default false,
  content_reminders boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table if not exists public.period_notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  campaign_id uuid references public.period_campaigns(id) on delete set null,
  notification_type text not null,
  channel text not null,
  status text not null check(status in ('queued','sent','delivered','opened','acted','failed','suppressed')),
  suppression_reason text,
  app_version text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_period_notification_events_time on public.period_notification_events(occurred_at desc, status);

alter table public.period_content add column if not exists content_type text not null default 'article';
alter table public.period_content add column if not exists locale text not null default 'en';
alter table public.period_content add column if not exists summary text;
alter table public.period_content add column if not exists tags text[] not null default '{}';
alter table public.period_content add column if not exists media_url text;
alter table public.period_content add column if not exists version integer not null default 1;
alter table public.period_content add column if not exists clinical_reviewed_at timestamptz;
alter table public.period_content add column if not exists scheduled_at timestamptz;
alter table public.period_content add column if not exists completion_count bigint not null default 0;

create table if not exists public.period_content_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  content_id uuid not null references public.period_content(id) on delete cascade,
  event_type text not null check(event_type in ('impression','open','complete','helpful','not_helpful','bookmark','unbookmark','share')),
  app_version text,
  occurred_at timestamptz not null default now()
);

alter table public.period_campaigns add column if not exists channel text not null default 'in_app';
alter table public.period_campaigns add column if not exists consent_type text not null default 'marketing';
alter table public.period_campaigns add column if not exists minimum_cohort_size integer not null default 100;
alter table public.period_campaigns add column if not exists frequency_cap_days smallint not null default 7;
alter table public.period_campaigns add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.period_campaigns add column if not exists approved_at timestamptz;

create table if not exists public.period_trivia_questions (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  question text not null,
  options jsonb not null,
  correct_option smallint not null check(correct_option >= 0),
  explanation text not null,
  difficulty text not null default 'beginner' check(difficulty in ('beginner','intermediate','advanced')),
  status text not null default 'draft' check(status in ('draft','review','published','archived')),
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_trivia_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_key text not null,
  question_count smallint not null,
  correct_count smallint not null,
  points integer not null default 0,
  duration_seconds integer,
  app_version text,
  completed_at timestamptz not null default now()
);

create table if not exists public.period_app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  platform text,
  app_version text,
  status text not null default 'success' check(status in ('success','failure','warning')),
  duration_ms integer,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_period_app_events_quality on public.period_app_events(event_name, occurred_at desc, status);

create table if not exists public.period_feature_flags (
  key text primary key,
  description text not null,
  enabled boolean not null default false,
  rollout_percent smallint not null default 0 check(rollout_percent between 0 and 100),
  minimum_app_version text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.period_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check(request_type in ('export','delete','correct','restrict')),
  status text not null default 'received' check(status in ('received','verified','processing','completed','rejected','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.period_ai_model_metrics add column if not exists model_version text;
alter table public.period_ai_model_metrics add column if not exists sample_size integer;
alter table public.period_ai_model_metrics add column if not exists mean_absolute_error numeric(6,3);
alter table public.period_ai_model_metrics add column if not exists confidence_coverage numeric(6,3);
alter table public.period_ai_model_metrics add column if not exists drift_score numeric(6,4);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_user_settings','period_daily_logs','period_cycle_revisions','period_safety_flags',
    'period_notification_preferences','period_trivia_questions','period_feature_flags',
    'period_privacy_requests'
  ] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_user_settings','period_daily_logs','period_cycle_revisions','period_forecasts',
    'period_safety_flags','period_notification_preferences','period_notification_events',
    'period_content_events','period_trivia_questions','period_trivia_attempts',
    'period_app_events','period_feature_flags','period_privacy_requests'
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

-- Owner policies expose only the records needed by the signed-in Plasence user.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'period_user_settings','period_daily_logs','period_forecasts',
    'period_notification_preferences','period_trivia_attempts','period_privacy_requests'
  ] loop
    execute format('drop policy if exists owner_access on public.%I', table_name);
    execute format(
      'create policy owner_access on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end $$;

drop policy if exists owner_read_revisions on public.period_cycle_revisions;
create policy owner_read_revisions on public.period_cycle_revisions
  for select to authenticated using(user_id = auth.uid());

drop policy if exists owner_create_revisions on public.period_cycle_revisions;
create policy owner_create_revisions on public.period_cycle_revisions
  for insert to authenticated with check(user_id = auth.uid() and requested_by = auth.uid());

drop policy if exists published_period_content on public.period_content;
create policy published_period_content on public.period_content
  for select to authenticated using(status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists published_period_trivia on public.period_trivia_questions;
create policy published_period_trivia on public.period_trivia_questions
  for select to authenticated using(status = 'published' and (published_at is null or published_at <= now()));

drop policy if exists owner_period_content_events on public.period_content_events;
create policy owner_period_content_events on public.period_content_events
  for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());

drop policy if exists owner_period_app_events_insert on public.period_app_events;
create policy owner_period_app_events_insert on public.period_app_events
  for insert to authenticated with check(user_id = auth.uid());

drop policy if exists owner_period_notification_events_read on public.period_notification_events;
create policy owner_period_notification_events_read on public.period_notification_events
  for select to authenticated using(user_id = auth.uid());

drop policy if exists enabled_period_feature_flags_read on public.period_feature_flags;
create policy enabled_period_feature_flags_read on public.period_feature_flags
  for select to authenticated using(enabled = true);


insert into public.period_feature_flags(key, description, enabled, rollout_percent) values
  ('daily_observations_v2','Normalized daily observations and offline sync',false,0),
  ('forecast_confidence','Show confidence ranges with cycle forecasts',false,0),
  ('clinically_reviewed_content','Serve only content with current clinical review',true,100),
  ('trivia_v1','Clinically reviewed menstrual-health trivia',false,0)
on conflict(key) do nothing;

comment on column public.period_daily_logs.note_ciphertext is 'Application-encrypted free text. Never return this field in admin list endpoints.';
comment on table public.period_safety_flags is 'Non-diagnostic review signals. Records must not be presented as medical diagnoses.';

create or replace function public.review_period_cycle_revision(
  p_revision_id uuid,
  p_resolution text,
  p_reviewer uuid
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  revision public.period_cycle_revisions%rowtype;
begin
  if p_resolution not in ('approved','rejected') then
    raise exception 'invalid resolution';
  end if;
  if not exists (
    select 1 from public.user_profiles
    where user_id = p_reviewer and role in ('super_admin','admin')
      and coalesce(status, 'active') <> 'suspended'
  ) then
    raise exception 'reviewer is not authorized';
  end if;

  select * into revision from public.period_cycle_revisions
  where id = p_revision_id for update;
  if revision.id is null or revision.status <> 'pending' then
    raise exception 'revision is not pending';
  end if;

  if p_resolution = 'approved' then
    update public.period_cycles set
      period_start_date = case when revision.proposed_values ? 'period_start_date' then (revision.proposed_values->>'period_start_date')::date else period_start_date end,
      period_end_date = case when revision.proposed_values ? 'period_end_date' then (revision.proposed_values->>'period_end_date')::date else period_end_date end,
      cycle_length = case when revision.proposed_values ? 'cycle_length' then (revision.proposed_values->>'cycle_length')::smallint else cycle_length end,
      period_length = case when revision.proposed_values ? 'period_length' then (revision.proposed_values->>'period_length')::smallint else period_length end,
      source = 'admin'
    where id = revision.cycle_id;

    update public.period_forecasts set superseded_at = now()
    where cycle_id = revision.cycle_id and superseded_at is null;

    insert into public.period_app_events(user_id,event_name,platform,status,occurred_at,metadata)
    values(revision.user_id,'forecast_recalculation_queued','admin','warning',now(),jsonb_build_object('cycle_id',revision.cycle_id,'revision_id',revision.id));
  end if;

  update public.period_cycle_revisions set
    status = p_resolution,
    reviewed_by = p_reviewer,
    reviewed_at = now(),
    forecast_impact = case when p_resolution = 'approved'
      then forecast_impact || jsonb_build_object('recalculation_queued_at',now())
      else forecast_impact end
  where id = p_revision_id;
end;
$$;

revoke all on function public.review_period_cycle_revision(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.review_period_cycle_revision(uuid,text,uuid) to service_role;

-- Period Library, AI editorial workflow, Friday Trivia, and consented lead capture.
do $$ begin
  create type public.period_source_menu as enum ('healthy_living','conditions','symptoms');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.period_ai_job_status as enum ('queued','running','review','complete','failed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.period_trivia_event_status as enum ('draft','ready','live','ended','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.period_lead_status as enum ('new','contacted','qualified','converted','disqualified','do_not_contact');
exception when duplicate_object then null; end $$;

alter table public.period_content
  add column if not exists curation_type text not null default 'native'
    check (curation_type in ('native','curated','ai_suggested')),
  add column if not exists ai_job_id uuid,
  add column if not exists recommendation_eligible boolean not null default true;

create table if not exists public.period_content_sources (
  id uuid primary key default gen_random_uuid(),
  period_content_id uuid references public.period_content(id) on delete cascade,
  source_menu public.period_source_menu not null,
  source_id uuid not null,
  source_title text not null,
  source_excerpt text,
  source_snapshot_hash text not null,
  linked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(period_content_id, source_menu, source_id)
);

create table if not exists public.period_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('trivia_generation','content_curation','content_suggestion','engagement_copy')),
  status public.period_ai_job_status not null default 'queued',
  source_menus public.period_source_menu[] not null,
  source_ids jsonb not null default '{}'::jsonb,
  configuration jsonb not null default '{}'::jsonb,
  model_key text not null default 'gemini-2.0-flash',
  model_version text,
  prompt_version text not null default 'period-editorial-v1',
  requested_by uuid not null references auth.users(id),
  output jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  error_code text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  check (cardinality(source_menus) between 1 and 3)
);

alter table public.period_content
  drop constraint if exists period_content_ai_job_id_fkey;
alter table public.period_content
  add constraint period_content_ai_job_id_fkey foreign key (ai_job_id)
  references public.period_ai_jobs(id) on delete set null;

create table if not exists public.period_trivia_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status public.period_trivia_event_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Africa/Accra',
  question_count smallint not null default 10 check (question_count = 10),
  leaderboard_publish_at timestamptz,
  lead_form_enabled boolean not null default true,
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (extract(isodow from starts_at at time zone timezone) = 5)
);

alter table public.period_trivia_questions
  add column if not exists event_id uuid references public.period_trivia_events(id) on delete cascade,
  add column if not exists position smallint check (position between 1 and 10),
  add column if not exists source_refs jsonb not null default '[]'::jsonb,
  add column if not exists ai_job_id uuid references public.period_ai_jobs(id) on delete set null,
  add column if not exists validation_status text not null default 'pending'
    check (validation_status in ('pending','valid','needs_review','rejected'));
create unique index if not exists uq_period_trivia_event_position
  on public.period_trivia_questions(event_id, position) where event_id is not null;

create table if not exists public.period_trivia_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.period_trivia_events(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  device_hash text not null,
  mobile_hash text not null,
  score smallint not null check (score between 0 and 10),
  question_count smallint not null default 10 check (question_count = 10),
  answers jsonb not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  submitted_at timestamptz not null default now(),
  unique(event_id, device_hash),
  unique(event_id, mobile_hash)
);

create table if not exists public.period_trivia_leads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.period_trivia_events(id) on delete restrict,
  submission_id uuid not null unique references public.period_trivia_submissions(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  full_name_ciphertext text not null,
  mobile_ciphertext text not null,
  social_handle_ciphertext text not null,
  mobile_hash text not null,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  acquisition_source text not null default 'period_trivia',
  campaign_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status public.period_lead_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  last_contacted_at timestamptz,
  admin_notes_ciphertext text,
  created_at timestamptz not null default now()
);

create table if not exists public.period_ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('content','alert','engagement')),
  target_id uuid,
  reason_code text not null,
  model_key text not null default 'period-next-best-action',
  model_version text not null default '1.0.0',
  policy_version text not null default 'period-safety-v1',
  confidence numeric(4,3) check (confidence between 0 and 1),
  feature_summary jsonb not null default '{}'::jsonb,
  status text not null default 'eligible' check (status in ('eligible','displayed','opened','dismissed','completed','suppressed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_period_ai_jobs_created on public.period_ai_jobs(created_at desc);
create index if not exists idx_period_trivia_events_schedule on public.period_trivia_events(starts_at, ends_at);
create index if not exists idx_period_trivia_submissions_rank on public.period_trivia_submissions(event_id, score desc, duration_seconds asc, submitted_at asc);
create index if not exists idx_period_trivia_leads_user on public.period_trivia_leads(user_id, created_at desc);
create index if not exists idx_period_ai_recommendations_user on public.period_ai_recommendations(user_id, created_at desc);

alter table public.period_content_sources enable row level security;
alter table public.period_ai_jobs enable row level security;
alter table public.period_trivia_events enable row level security;
alter table public.period_trivia_submissions enable row level security;
alter table public.period_trivia_leads enable row level security;
alter table public.period_ai_recommendations enable row level security;

drop policy if exists period_events_authenticated_read on public.period_trivia_events;
create policy period_events_authenticated_read on public.period_trivia_events
  for select to authenticated using(status in ('ready','live','ended'));
drop policy if exists period_recommendations_owner on public.period_ai_recommendations;
create policy period_recommendations_owner on public.period_ai_recommendations
  for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());


create or replace function public.review_period_trivia_event(
  p_event_id uuid,
  p_reviewer uuid
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_event public.period_trivia_events%rowtype;
  v_questions integer;
begin
  if not exists (
    select 1 from public.user_profiles where user_id = p_reviewer
      and role in ('super_admin','admin') and coalesce(status,'active') <> 'suspended'
  ) then raise exception 'reviewer is not authorized'; end if;

  select * into v_event from public.period_trivia_events where id = p_event_id for update;
  if v_event.id is null then raise exception 'event not found'; end if;
  if extract(isodow from v_event.starts_at at time zone v_event.timezone) <> 5 then
    raise exception 'Friday Trivia must start on Friday in the configured timezone';
  end if;

  select count(*) into v_questions from public.period_trivia_questions
  where event_id = p_event_id and status = 'published' and validation_status = 'valid'
    and position between 1 and 10;
  if v_questions <> 10 then raise exception 'exactly 10 reviewed questions are required'; end if;

  update public.period_trivia_events set status = 'ready', reviewed_by = p_reviewer,
    reviewed_at = now(), leaderboard_publish_at = coalesce(leaderboard_publish_at, ends_at), updated_at = now()
  where id = p_event_id;
end;
$$;
revoke all on function public.review_period_trivia_event(uuid,uuid) from public, anon, authenticated;
grant execute on function public.review_period_trivia_event(uuid,uuid) to service_role;

create or replace function public.submit_period_trivia(
  p_event_id uuid, p_user_id uuid, p_device_hash text, p_mobile_hash text,
  p_score smallint, p_answers jsonb, p_duration_seconds integer,
  p_full_name_ciphertext text, p_mobile_ciphertext text, p_social_handle_ciphertext text,
  p_consent_version text, p_campaign_code text, p_utm_source text, p_utm_medium text, p_utm_campaign text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_submission_id uuid;
begin
  if not exists (
    select 1 from public.period_trivia_events
    where id = p_event_id and status in ('ready','live') and now() between starts_at and ends_at
  ) then raise exception 'event is not accepting submissions'; end if;
  if jsonb_array_length(p_answers) <> 10 or p_score not between 0 and 10 then
    raise exception 'invalid trivia submission';
  end if;
  insert into public.period_trivia_submissions(event_id,user_id,device_hash,mobile_hash,score,answers,duration_seconds)
  values(p_event_id,p_user_id,p_device_hash,p_mobile_hash,p_score,p_answers,p_duration_seconds)
  returning id into v_submission_id;
  insert into public.period_trivia_leads(event_id,submission_id,user_id,full_name_ciphertext,mobile_ciphertext,social_handle_ciphertext,mobile_hash,consent_version,campaign_code,utm_source,utm_medium,utm_campaign)
  values(p_event_id,v_submission_id,p_user_id,p_full_name_ciphertext,p_mobile_ciphertext,p_social_handle_ciphertext,p_mobile_hash,p_consent_version,p_campaign_code,p_utm_source,p_utm_medium,p_utm_campaign);
  return v_submission_id;
end;
$$;
revoke all on function public.submit_period_trivia(uuid,uuid,text,text,smallint,jsonb,integer,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_period_trivia(uuid,uuid,text,text,smallint,jsonb,integer,text,text,text,text,text,text,text,text) to service_role;

comment on table public.period_ai_jobs is 'Auditable AI editorial jobs. AI output remains draft until an authorized human review.';
comment on table public.period_trivia_leads is 'Consent-gated encrypted lead data. Admin APIs must return masked values by default.';
comment on column public.period_trivia_submissions.device_hash is 'HMAC of a server-issued HttpOnly device token; raw identifiers are never stored.';

-- Plasence Library publishing and AI source-index contract.
alter table public.period_content
  add column if not exists slug text,
  add column if not exists cover_image_url text,
  add column if not exists publish_from timestamptz,
  add column if not exists publish_until timestamptz,
  add column if not exists reading_minutes smallint check (reading_minutes is null or reading_minutes between 1 and 180),
  add column if not exists featured boolean not null default false,
  add column if not exists review_expires_at timestamptz,
  add column if not exists reading_level text not null default 'general'
    check (reading_level in ('simple','general','detailed')),
  add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists uq_period_content_slug on public.period_content(slug) where slug is not null;
create index if not exists idx_period_content_library_catalog on public.period_content(status, published_at desc);

create table if not exists public.period_content_publications (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.period_content(id) on delete cascade,
  channel text not null check (channel in ('plasence_library','four_ol_app','web','email')),
  status text not null default 'scheduled' check (status in ('scheduled','live','paused','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  featured boolean not null default false,
  display_order integer not null default 0,
  minimum_app_version text,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_id, channel),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.period_content_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  curation_type text not null default 'manual' check (curation_type in ('manual','ai_suggested','rule_based')),
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.period_content_collection_items (
  collection_id uuid not null references public.period_content_collections(id) on delete cascade,
  content_id uuid not null references public.period_content(id) on delete cascade,
  display_order integer not null default 0,
  reason text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(collection_id, content_id)
);

create table if not exists public.period_content_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.period_content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, content_id)
);

create table if not exists public.period_content_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.period_content(id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  last_position text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id, content_id)
);

create table if not exists public.period_source_documents (
  id uuid primary key default gen_random_uuid(),
  source_menu public.period_source_menu not null,
  source_id uuid not null,
  title text not null,
  summary text,
  body_text text not null,
  source_status text not null default 'active',
  source_hash text not null,
  source_updated_at timestamptz,
  indexed_at timestamptz not null default now(),
  unique(source_menu, source_id)
);

create table if not exists public.period_source_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.period_source_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  heading text,
  content text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists public.period_source_embeddings (
  chunk_id uuid primary key references public.period_source_chunks(id) on delete cascade,
  embedding double precision[] not null,
  embedding_model text not null,
  embedding_version text not null,
  created_at timestamptz not null default now(),
  check (cardinality(embedding) > 0)
);

alter table public.period_content_events drop constraint if exists period_content_events_event_type_check;
alter table public.period_content_events add constraint period_content_events_event_type_check
  check(event_type in ('impression','open','progress','complete','helpful','not_helpful','bookmark','unbookmark','share','dismiss'));

create index if not exists idx_period_publications_channel on public.period_content_publications(channel,status,starts_at,ends_at);
create index if not exists idx_period_collections_status on public.period_content_collections(status,display_order);
create index if not exists idx_period_content_progress_user on public.period_content_progress(user_id,updated_at desc);
create index if not exists idx_period_source_documents_menu on public.period_source_documents(source_menu,indexed_at desc);

alter table public.period_content_publications enable row level security;
alter table public.period_content_collections enable row level security;
alter table public.period_content_collection_items enable row level security;
alter table public.period_content_bookmarks enable row level security;
alter table public.period_content_progress enable row level security;
alter table public.period_source_documents enable row level security;
alter table public.period_source_chunks enable row level security;
alter table public.period_source_embeddings enable row level security;

drop policy if exists owner_period_content_bookmarks on public.period_content_bookmarks;
create policy owner_period_content_bookmarks on public.period_content_bookmarks for all to authenticated
  using(user_id = auth.uid()) with check(user_id = auth.uid());
drop policy if exists owner_period_content_progress on public.period_content_progress;
create policy owner_period_content_progress on public.period_content_progress for all to authenticated
  using(user_id = auth.uid()) with check(user_id = auth.uid());

create or replace function public.sync_plasence_library_publication()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    if nullif(trim(new.slug),'') is null or nullif(trim(new.summary),'') is null
       or nullif(trim(new.body_html),'') is null or new.reviewed_by is null
       or new.clinical_reviewed_at is null then
      raise exception 'Library publication requires slug, summary, body and clinical review';
    end if;
    insert into public.period_content_publications(content_id,channel,status,starts_at,ends_at,featured,published_by)
    values(new.id,'plasence_library',case when coalesce(new.publish_from,now()) <= now() then 'live' else 'scheduled' end,
      coalesce(new.publish_from,now()),new.publish_until,new.featured,new.reviewed_by)
    on conflict(content_id,channel) do update set
      status=excluded.status,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
      featured=excluded.featured,published_by=excluded.published_by,updated_at=now();
  elsif tg_op = 'UPDATE' then
    if old.status = 'published' and new.status <> 'published' then
      update public.period_content_publications set status='paused',updated_at=now()
      where content_id=new.id and channel='plasence_library';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sync_plasence_library_publication on public.period_content;
create trigger trg_sync_plasence_library_publication after insert or update of status on public.period_content
for each row execute function public.sync_plasence_library_publication();

update public.period_content set
  slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g')),''),'content') || '-' || left(id::text,8),
  summary = coalesce(nullif(trim(summary),''),left(trim(regexp_replace(body_html,'<[^>]+>',' ','g')),500))
where status='published' and (slug is null or nullif(trim(summary),'') is null);

insert into public.period_content_publications(content_id,channel,status,starts_at,ends_at,featured,published_by)
select id,'plasence_library',case when coalesce(publish_from,published_at,now()) <= now() then 'live' else 'scheduled' end,
  coalesce(publish_from,published_at,now()),publish_until,featured,reviewed_by
from public.period_content
where status='published' and reviewed_by is not null and clinical_reviewed_at is not null
  and nullif(trim(slug),'') is not null and nullif(trim(summary),'') is not null and nullif(trim(body_html),'') is not null
on conflict(content_id,channel) do nothing;


comment on table public.period_content_publications is 'Channel-specific distribution state. A live plasence_library row makes reviewed Period content visible in the mobile Library.';
comment on table public.period_source_documents is 'Normalized, approved source material from Healthy Living, Conditions and Symptoms for governed AI retrieval.';
