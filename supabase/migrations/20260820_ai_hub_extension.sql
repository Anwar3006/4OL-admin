-- =============================================================================
-- AI Hub extension (Gap Analysis Part O).
--
-- Adds the model registry, recommendation stats and supporting columns that
-- back the Models / Recommendations / Analytics tabs of /ai.
-- Decisions: O-D1 (seed 8 models), O-D2 (manual accuracy column),
-- O-D3 (risk_level override column, server-derived default), O-D5 (cache_hit),
-- O-D7 (fitness_ai_calls keeps its name — platform-wide AI usage log).
-- Additive and re-runnable. Reconcile against full-tables.sql before apply.
-- =============================================================================

-- 1. Model registry -----------------------------------------------------------
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model_key text not null unique,
  description text,
  model_type text not null check (model_type in (
    'classification', 'nlp', 'medical_nlp', 'recommendation',
    'anomaly_detection', 'generative_ai', 'translation', 'regression'
  )),
  version text not null default 'v1.0',
  accuracy_latest numeric(5, 2),          -- NULL = no eval yet, UI shows "—"
  accuracy_target numeric(5, 2) not null default 90,
  latency_p50_ms integer,
  status text not null default 'active' check (status in ('active', 'beta', 'staging', 'paused')),
  last_trained_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  deployed_by uuid references public.user_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_models enable row level security;
-- No policies: admin panel accesses via service-role server routes only.

-- O-D1: seed the 8 mockup models (accuracy values are editable baselines).
insert into public.ai_models (name, model_key, description, model_type, version, accuracy_latest, accuracy_target, status) values
  ('Symptom Classifier', 'symptom-classifier', 'Maps user-reported symptoms to likely body parts and conditions', 'classification', 'v2.3', 94.20, 90, 'active'),
  ('Twi Language Translator', 'twi-translator', 'English-Twi translation for health content and consultations', 'translation', 'v1.8', 82.40, 90, 'active'),
  ('Content Moderation Guard', 'moderation-guard', 'Flags harmful, spam and policy-violating content across chats and reviews', 'nlp', 'v3.1', 96.80, 95, 'active'),
  ('Workout Recommender', 'workout-recommender', 'Personalises fitness plans from goals, equipment and history', 'recommendation', 'v2.0', 91.50, 88, 'active'),
  ('Medication Interaction Checker', 'med-interaction-checker', 'Screens drug-drug interactions for the medication reminder', 'medical_nlp', 'v1.4', 93.10, 95, 'active'),
  ('Usage Anomaly Detector', 'usage-anomaly-detector', 'Detects anomalous account and API usage patterns', 'anomaly_detection', 'v1.1', 89.70, 85, 'beta'),
  ('Health Content Drafter', 'health-content-drafter', 'Drafts period-library and healthy-living content for editor review', 'generative_ai', 'v1.2', null, 90, 'beta'),
  ('Engagement Forecaster', 'engagement-forecaster', 'Forecasts weekly engagement for campaign planning', 'regression', 'v0.9', null, 85, 'staging')
on conflict (model_key) do nothing;

-- 2. Usage log extensions -----------------------------------------------------
alter table public.fitness_ai_calls
  add column if not exists ai_model_id uuid references public.ai_models (id),
  add column if not exists cache_hit boolean not null default false;

create index if not exists idx_fitness_ai_calls_model on public.fitness_ai_calls (ai_model_id);

-- 3. Moderation risk override -------------------------------------------------
-- NULL means "derive from ai_confidence" (>=90 high, >=70 medium, else low).
alter table public.content_moderation_flags
  add column if not exists risk_level text check (risk_level in ('high', 'medium', 'low'));

-- 4. Recommendation stats -----------------------------------------------------
-- Written by the recommender pipeline or manual import (O-D4). UI shows an
-- empty state until rows exist — no fake metrics.
create table if not exists public.ai_recommendation_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null default current_date,
  user_segment text not null,
  recommendation_type text not null,
  items_served integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  satisfaction numeric(4, 2),
  model_version text,
  created_at timestamptz not null default now(),
  unique (stat_date, user_segment, recommendation_type)
);

alter table public.ai_recommendation_stats enable row level security;

-- 5. Hub overview RPC ---------------------------------------------------------
-- Feeds the four KPI cards on /ai in one round-trip.
create or replace function public.get_ai_hub_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_models', (select count(*) from public.ai_models where status = 'active'),
    'pending_flags', (select count(*) from public.content_moderation_flags where status = 'pending_review'::moderation_status),
    'avg_accuracy', (select round(avg(accuracy_latest), 1) from public.ai_models where accuracy_latest is not null),
    'queries_today', (select count(*) from public.fitness_ai_calls where created_at >= date_trunc('day', now()))
  );
$$;

revoke all on function public.get_ai_hub_overview() from public, anon, authenticated;
grant execute on function public.get_ai_hub_overview() to service_role;
