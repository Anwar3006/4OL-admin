-- Period Tracker production transform: Premium entitlements, Trivia prize
-- fulfillment, blocked-device enforcement, trivia rules, and AI content
-- suggestion scheduling (approved admin mockup -> production).
--
-- Privacy model follows the existing period tables: all new tables are
-- admin-only via public.is_app_admin(); lead/device identifiers stay hashed
-- or encrypted and are only masked/decrypted by the admin API route.

-- ---------------------------------------------------------------------------
-- 1. Reward catalog: cash and airtime prize types
-- ---------------------------------------------------------------------------
alter table public.period_trivia_rewards
  drop constraint if exists period_trivia_rewards_reward_type_check;
alter table public.period_trivia_rewards
  add constraint period_trivia_rewards_reward_type_check
  check (reward_type in ('points', 'badge', 'discount', 'prize', 'cash', 'airtime'));

comment on column public.period_trivia_rewards.reward_type is
  'points / badge / discount / prize (in-app) or cash (MoMo payout) / airtime (data bundle) — cash and airtime require a consented lead and go through the fulfillment flow.';

-- ---------------------------------------------------------------------------
-- 2. Premium settings (singleton): onboarding trial for every new user
-- ---------------------------------------------------------------------------
create table if not exists public.period_premium_settings (
  id integer primary key default 1 check (id = 1),
  onboarding_trial_days integer not null default 14 check (onboarding_trial_days in (0, 7, 14, 30)),
  auto_lock_on_expiry boolean not null default true,
  show_paywall_on_expiry boolean not null default true,
  expiry_reminder_days integer not null default 3 check (expiry_reminder_days between 0 and 14),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.period_premium_settings (id)
values (1)
on conflict (id) do nothing;

comment on table public.period_premium_settings is
  'Singleton Cycle Pro rollout settings. onboarding_trial_days = free premium for every new user after Plasence onboarding; 0 disables the trial. On expiry premium features auto-lock until the user subscribes.';

-- ---------------------------------------------------------------------------
-- 3. Manual premium grants: duration-capped, audit-logged, auto-expiring
-- ---------------------------------------------------------------------------
create table if not exists public.period_premium_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'cycle_pro' check (tier in ('cycle_pro', 'cycle_pro_ttc', 'cycle_pro_insights')),
  source text not null default 'manual' check (source in ('manual', 'onboarding_trial', 'trivia_prize', 'goodwill', 'clinical_program', 'partner', 'beta')),
  reason text not null check (char_length(reason) between 2 and 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at),
  -- No indefinite access: every grant is capped at 90 days from its start.
  check (expires_at <= starts_at + interval '90 days')
);

create index if not exists idx_period_premium_grants_user on public.period_premium_grants(user_id, expires_at desc);
create index if not exists idx_period_premium_grants_active on public.period_premium_grants(expires_at) where revoked_at is null;

comment on table public.period_premium_grants is
  'Super-admin Cycle Pro entitlement grants. Every grant has a duration cap and a mandatory reason; expired/revoked rows are kept for the audit trail. source=onboarding_trial rows are created automatically at signup and respect period_premium_settings.onboarding_trial_days.';

-- ---------------------------------------------------------------------------
-- 4. Trivia prize fulfillment: Sent -> in-app prompt -> Fulfilled
-- ---------------------------------------------------------------------------
create table if not exists public.period_trivia_fulfillment (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.period_trivia_events(id) on delete cascade,
  submission_id uuid references public.period_trivia_submissions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  tier_label text not null check (char_length(tier_label) between 2 and 120),
  reward_id uuid references public.period_trivia_rewards(id) on delete set null,
  prize_status text not null default 'pending' check (prize_status in ('pending', 'sent', 'fulfilled')),
  sent_at timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  prompt_sent_at timestamptz,
  confirmed_at timestamptz,
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_period_trivia_fulfillment_event on public.period_trivia_fulfillment(event_id, prize_status);
create unique index if not exists uq_period_trivia_fulfillment_entry
  on public.period_trivia_fulfillment(event_id, submission_id, tier_label);

comment on table public.period_trivia_fulfillment is
  'One row per winner x prize tier. Admin marks the prize Sent after payout (cash via consented lead MoMo number, airtime via top-up); the winner then receives an in-app fulfillment prompt. Fulfilled closes the loop once the user confirms/redeems.';

-- ---------------------------------------------------------------------------
-- 5. Blocked devices / users: anti-fraud enforcement for Trivia
-- ---------------------------------------------------------------------------
create table if not exists public.period_trivia_blocked_devices (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null check (char_length(device_hash) between 8 and 160),
  mobile_hash text check (mobile_hash is null or char_length(mobile_hash) between 8 and 160),
  user_id uuid references auth.users(id) on delete set null,
  violation text not null check (violation in ('duplicate_submission', 'multi_account_farming', 'bot_like_completion', 'answer_set_probing', 'other')),
  evidence text check (evidence is null or char_length(evidence) <= 1000),
  status text not null default 'blocked' check (status in ('blocked', 'under_review', 'unblocked')),
  detected_at timestamptz not null default now(),
  blocked_by uuid references auth.users(id) on delete set null,
  unblocked_at timestamptz,
  unblocked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_period_trivia_blocked_devices_status on public.period_trivia_blocked_devices(status, detected_at desc);
create unique index if not exists uq_period_trivia_blocked_devices_active
  on public.period_trivia_blocked_devices(device_hash, coalesce(mobile_hash, '')) where status in ('blocked', 'under_review');

comment on table public.period_trivia_blocked_devices is
  'Privacy-hashed identifiers only (period-trivia-security privacyHash) — never raw device tokens or phone numbers. Active blocks are rejected server-side on trivia submit.';

-- ---------------------------------------------------------------------------
-- 6. Trivia rules settings (key/value, admin-editable)
-- ---------------------------------------------------------------------------
create table if not exists public.period_trivia_rules (
  key text primary key check (char_length(key) between 2 and 80),
  description text not null default '',
  value text not null,
  enforced_by text not null default 'server',
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.period_trivia_rules (key, description, value, enforced_by) values
  ('one_entry_per_device', 'Unique constraint on privacy-hashed device token and MoMo number per event', 'strict_reject', 'server'),
  ('server_authoritative_scoring', 'Score recomputed server-side from correct_option; client scores ignored', 'always', 'server'),
  ('questions_locked_outside_window', 'Quiz unlocks only during the reviewed start/end window; countdown synced to server time', '10_questions_fixed', 'server'),
  ('leaderboard_delayed_publish', 'Results visible only after event ends; anonymous Player NN labels', '+30_min_after_close', 'server'),
  ('winners_notification', 'Popup notification to every participant when results publish; winners list and month/lifetime rankings in-app', 'all_participants', 'mobile'),
  ('minimum_completion_time', 'Submissions faster than threshold flagged for bot review', '45_seconds', 'server'),
  ('consent_required_for_prizes', 'Cash/airtime prizes need consented lead form; encrypted at rest', 'trivia-lead-v1', 'server'),
  ('reminder_frequency_cap', 'Trivia reminder notifications per opted-in user', '1_per_7_days', 'notifications'),
  ('per_device_question_shuffle', 'Seeded Fisher-Yates shuffle of question and option order per device+event so shared answer sheets are useless; scoring stays question-ID based', 'hmac_seeded', 'server')
on conflict (key) do nothing;

comment on table public.period_trivia_rules is
  'Admin-editable Trivia rule sheet. Values are configuration strings interpreted by the trivia API/mobile app; every change is audit-logged by the admin route.';

-- ---------------------------------------------------------------------------
-- 7. AI content suggestions: admin-controlled rollout columns on ai jobs
-- ---------------------------------------------------------------------------
alter table public.period_ai_jobs
  add column if not exists scheduled_at timestamptz,
  add column if not exists frequency_cap_days integer check (frequency_cap_days is null or frequency_cap_days between 1 and 90),
  add column if not exists surface_duration_weeks integer check (surface_duration_weeks is null or surface_duration_weeks between 1 and 12),
  add column if not exists surface_channel text check (surface_channel is null or surface_channel in ('plasence_library', 'push_digest', 'today_tip')),
  add column if not exists scheduled_by uuid references auth.users(id) on delete set null;

comment on column public.period_ai_jobs.scheduled_at is
  'Content-tab AI suggestions: admin manually sets the publish date; AI never self-publishes.';

-- ---------------------------------------------------------------------------
-- RLS: admin-only, same pattern as the rest of the period schema
-- ---------------------------------------------------------------------------
alter table public.period_premium_settings enable row level security;
alter table public.period_premium_grants enable row level security;
alter table public.period_trivia_fulfillment enable row level security;
alter table public.period_trivia_blocked_devices enable row level security;
alter table public.period_trivia_rules enable row level security;

create policy admin_access on public.period_premium_settings
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy admin_access on public.period_premium_grants
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy admin_access on public.period_trivia_fulfillment
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy admin_access on public.period_trivia_blocked_devices
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy admin_access on public.period_trivia_rules
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
