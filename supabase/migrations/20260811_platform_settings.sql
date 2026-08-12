create table if not exists public.platform_settings (
  id text primary key default 'global',
  platform_name text not null default '4 Our Life',
  support_email text,
  support_phone text,
  default_language text not null default 'en' check (default_language in ('en', 'twi', 'ga')),
  maintenance_mode boolean not null default false,
  maintenance_message text,
  maintenance_allowed_routes text[] not null default array['/api/health']::text[],
  maintenance_scheduled_start timestamptz,
  maintenance_scheduled_end timestamptz,
  security_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in ('google', 'twilio', 'resend', 'paystack', 'momo', 'gemini', 'firebase', 'openai')),
  environment text not null default 'production' check (environment in ('development', 'staging', 'production')),
  key_hint text,
  key_hash text,
  active boolean not null default true,
  last_used timestamptz,
  created_by uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in ('google', 'twilio', 'resend', 'paystack', 'momo', 'gemini', 'firebase', 'openai', 'supabase', 'github')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'pending')),
  webhook_url text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.platform_api_keys enable row level security;
alter table public.platform_integrations enable row level security;
