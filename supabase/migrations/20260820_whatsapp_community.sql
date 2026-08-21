-- =============================================================================
-- WhatsApp Community (Gap Analysis Part T).
--
-- WhatsApp is a CHANNEL of the notifications pipeline (T-D1), not a silo:
-- broadcast delivery reuses notifications (channel = 'whatsapp') and
-- notification_campaigns; this schema adds the community/registry layer.
-- Decisions: T-D4 (template registry, queue-time enforcement), T-D5 (consent
-- stamp on user_profiles). Meta tokens never live here (T-D3 — Edge Function
-- secrets only). Additive and re-runnable.
-- =============================================================================

-- 1. Community groups ----------------------------------------------------------
create table if not exists public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  group_type text not null default 'community' check (group_type in ('challenge', 'community', 'event', 'gym', 'wellness', 'network')),
  linked_to text not null default 'user_segments' check (linked_to in ('admin_panel', 'hcp_module', 'ibp_module', 'user_segments', 'fitness')),
  linked_id uuid,                            -- optional FK target per linked_to
  member_count integer not null default 0,   -- trigger/maintained by membership changes
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  last_message_at timestamptz,
  created_by uuid references public.user_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.whatsapp_groups (id) on delete cascade,
  user_id uuid not null references public.user_profiles (user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (group_id, user_id)
);

create index if not exists idx_wa_group_members_user on public.whatsapp_group_members (user_id);

-- 2. Meta template registry (T-D4) ----------------------------------------------
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  meta_template_id text unique,
  name text not null,
  language text not null default 'en',
  category text,                              -- marketing | utility | authentication
  body_preview text,
  status text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Seed the mockup's known templates as pending-sync shells.
insert into public.whatsapp_templates (name, category, status) values
  ('health_alert_v1', 'utility', 'approved'),
  ('appointment_reminder_v2', 'utility', 'approved'),
  ('promo_code_v1', 'marketing', 'approved')
on conflict do nothing;

-- 3. Broadcasts ------------------------------------------------------------------
create table if not exists public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid references public.whatsapp_templates (id),
  group_id uuid references public.whatsapp_groups (id),  -- NULL = audience segment
  audience_filter jsonb not null default '{}'::jsonb,
  message text not null check (char_length(message) <= 1024),
  media_url text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'queued', 'sent', 'failed')),
  delivery_stats jsonb not null default '{}'::jsonb,     -- receipts from Meta webhook
  created_by uuid references public.user_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wa_broadcasts_status on public.whatsapp_broadcasts (status, created_at desc);

-- 4. Consent (T-D5, GH-DPA) --------------------------------------------------------
alter table public.user_profiles
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists whatsapp_opt_in_at timestamptz;

-- 5. Fitness-tab KPI RPC ------------------------------------------------------------
create or replace function public.get_whatsapp_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'community_members', (select count(*) from public.whatsapp_group_members where left_at is null),
    'active_groups', (select count(*) from public.whatsapp_groups where status = 'active'),
    'messages_sent', (select count(*) from public.notifications where channel = 'whatsapp'),
    'avg_open_rate', (
      select case when count(*) filter (where delivered_at is not null) = 0 then null
             else round(100.0 * count(*) filter (where opened_at is not null)
                        / count(*) filter (where delivered_at is not null), 1)
             end
      from public.notifications where channel = 'whatsapp'
    )
  );
$$;

alter table public.whatsapp_groups enable row level security;
alter table public.whatsapp_group_members enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_broadcasts enable row level security;
-- No policies: service-role server routes only.

revoke all on function public.get_whatsapp_stats() from public, anon, authenticated;
grant execute on function public.get_whatsapp_stats() to service_role;
