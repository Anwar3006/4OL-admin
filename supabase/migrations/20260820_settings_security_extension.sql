-- =============================================================================
-- Settings security extension (Gap Analysis Part P).
--
-- Security-hardening schema for the Settings menu:
--   - settings_change_log  : who changed what, for every settings mutation
--   - maintenance_history  : audit trail for maintenance-mode toggles
--   - platform_webhooks    : signed webhook endpoint registry (API Keys tab)
--   - platform_settings    : guarded column additions the routes already read
--
-- Table shells from 20260811_platform_settings.sql may be absent from the
-- live dump — every statement here is additive/idempotent so both states
-- converge. Reconcile against full-tables.sql before apply.
-- =============================================================================

-- 1. Settings change audit log ------------------------------------------------
create table if not exists public.settings_change_log (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid not null references public.user_profiles (user_id),
  setting_area text not null,               -- platform|security|api_keys|billing|compliance|maintenance|feature_flags|integrations
  setting_key text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_settings_change_log_area on public.settings_change_log (setting_area, created_at desc);
alter table public.settings_change_log enable row level security;

-- 2. Maintenance history ------------------------------------------------------
create table if not exists public.maintenance_history (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null,
  message text,
  toggled_by uuid not null references public.user_profiles (user_id),
  created_at timestamptz not null default now()
);

alter table public.maintenance_history enable row level security;

-- 2b. Infrastructure cost budgets (Billing & GRA tab, P-D5) ------------------
-- Revenue KPIs stay "—" until the transactions source (K-D7) ships; infra
-- costs are live from this table.
create table if not exists public.infra_cost_budgets (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  provider text not null,
  budget_30d numeric(12, 2) not null default 0,
  usage_30d numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  unique (service, provider)
);

alter table public.infra_cost_budgets enable row level security;

-- 3. Webhook registry ---------------------------------------------------------
create table if not exists public.platform_webhooks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  events text[] not null default '{}',
  secret_hash text,                         -- hash only; never store plaintext
  active boolean not null default true,
  last_delivery_at timestamptz,
  last_delivery_status text,
  created_by uuid references public.user_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_webhooks enable row level security;

-- 4. platform_settings column guards ------------------------------------------
-- The settings routes already read/write these; guarantee they exist whether
-- or not 20260811_platform_settings.sql was applied to the target database.
create table if not exists public.platform_settings (
  id text primary key,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings
  add column if not exists platform_name text,
  add column if not exists support_email text,
  add column if not exists support_phone text,
  add column if not exists default_language text check (default_language in ('en', 'twi', 'ga')),
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists maintenance_message text,
  add column if not exists maintenance_allowed_routes text[] not null default '{/api/health}',
  add column if not exists maintenance_scheduled_start timestamptz,
  add column if not exists maintenance_scheduled_end timestamptz,
  -- P-D3: Security tab toggles live in a single jsonb column to avoid
  -- column churn ({ mfa_required, ip_whitelist[], geo_restriction, ... }).
  add column if not exists security_settings jsonb not null default '{}'::jsonb,
  -- P-D6: Compliance attestations (GH-DPA reg no, GRA TIN, HEFRA license,
  -- VAT rates, filing dates) — read-heavy, edited behind settings.billing.
  add column if not exists compliance jsonb not null default '{}'::jsonb,
  add column if not exists updated_by uuid references public.user_profiles (user_id),
  add column if not exists updated_at timestamptz;

alter table public.platform_settings enable row level security;

-- 5. API key + integration shells (same rationale as above) -------------------
create table if not exists public.platform_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  environment text not null default 'server',
  key_hash text,                            -- hash-only policy (Part P)
  key_hint text,                            -- first/last chars for display
  active boolean not null default true,
  revoked_at timestamptz,
  rotated_from_id uuid references public.platform_api_keys (id),
  last_used timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  configuration jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  updated_by uuid references public.user_profiles (user_id),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  description text,
  enabled boolean not null default false,
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  updated_by uuid references public.user_profiles (user_id),
  updated_at timestamptz not null default now()
);

alter table public.platform_api_keys enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.feature_flags enable row level security;
-- No policies on any of the above: service-role server routes only.

-- Column guards for tables created by 20260811_platform_settings.sql that
-- this workstream extends (idempotent whether or not that migration ran).
alter table public.platform_api_keys
  add column if not exists revoked_at timestamptz,
  add column if not exists rotated_from_id uuid references public.platform_api_keys (id);
