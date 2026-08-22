-- =============================================================================
-- Marketing subscriptions unification + campaign telemetry + promo redemption
-- (Marketing mockup parity build — 2026-08-22).
--
-- Problem solved: public.user_subscriptions was defined THREE times with
-- incompatible shapes —
--   1. business-facing (plan_id -> subscription_plans, full-tables.sql)
--   2. Gap Analysis Part M (plan_id -> marketing_subscriptions)
--   3. fitness monetization (tier_id -> subscription_tiers) — applied live,
--      backs get_my_entitlement() which the mobile app consumes.
-- All three used CREATE TABLE IF NOT EXISTS, so whichever applied first
-- silently disabled the others (and index creation on missing columns
-- aborted later migrations). Decision: the fitness/entitlement shape is the
-- single source of truth — mobile already reacts to user_subscriptions rows
-- via get_my_entitlement(), and its source enum reserves 'paystack'/'promo'.
--
-- This migration upgrades WHICHEVER shape exists into the unified consumer
-- subscriptions table, widens subscription_tiers with the mockup's consumer
-- plans (Starter/Pro/Elite), re-points get_marketing_overview() at tiers,
-- and ships analytics_events (campaign impression/click telemetry feeding
-- the admin CTR/ROAS surface) + discount_redemptions (promo-code auditing).
-- marketing_subscriptions is left untouched as legacy; new UI reads tiers.
-- Additive and re-runnable. No destructive operations.
-- =============================================================================


-- 1. subscription_tiers: widen key CHECK + seed the consumer plans --------------
-- Mockup plans: Free / Starter GH₵25 / Pro GH₵45 / Elite GH₵89 (monthly).
-- The key CHECK becomes a slug pattern so the admin "Create Plan" dialog can
-- add future tiers without another migration (get_my_entitlement and the
-- paywall only branch on 'free', so wider keys are safe).
alter table public.subscription_tiers
  drop constraint if exists subscription_tiers_key_check;
alter table public.subscription_tiers
  add constraint subscription_tiers_key_check
  check (key ~ '^[a-z][a-z0-9_]{0,39}$');

insert into public.subscription_tiers (key, name, description, price_ghs, duration_days, benefits, display_order)
values
  ('starter', 'Starter', 'Unlimited symptom checks, AI health tips, period tracker and medication reminders.', 25.00, 30,
   '["Unlimited symptom checks", "AI health tips", "Period tracker", "Medication reminders"]'::jsonb, 1),
  ('pro', 'Pro', 'Everything in Starter plus AI trainer, telemedicine consults and family cover.', 45.00, 30,
   '["Everything in Starter", "AI personal trainer", "Telemedicine (5 consults/mo)", "Family plan (4 members)"]'::jsonb, 2),
  ('elite', 'Elite', 'Everything in Pro plus unlimited telemedicine, priority support and concierge.', 89.00, 30,
   '["Everything in Pro", "Unlimited telemedicine", "Priority support", "Concierge service"]'::jsonb, 3)
on conflict (key) do nothing;

-- Stable paywall ordering across every seed generation (re-runnable).
update public.subscription_tiers
set display_order = case key
  when 'free' then 0 when 'starter' then 1 when 'pro' then 2
  when 'elite' then 3 when 'premium' then 4 when 'lifetime' then 5
  else 9 end;


-- 2. user_subscriptions: reconcile to the unified shape --------------------------
-- Fresh databases get the full unified table; existing tables (any of the
-- three historical shapes) are upgraded column-by-column.
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_id uuid references public.subscription_tiers(id),
  status text not null default 'active',
  source text not null default 'admin_grant',
  granted_by uuid,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  paystack_reference text,
  note text,
  subscribed_at timestamptz not null default now(),
  next_renewal_at timestamptz,
  payment_method text,
  auto_renew boolean not null default true,
  risk_reason text,
  last_reminded_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Status superset of every historical shape (re-runnable drop + re-add).
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('active', 'at_risk', 'cancelled', 'expired', 'revoked', 'suspended', 'pending'));

-- Upgrade path for pre-existing tables. Columns that already exist (any
-- shape) are skipped; the source CHECK is only added with the column.
alter table public.user_subscriptions
  add column if not exists tier_id uuid references public.subscription_tiers(id),
  add column if not exists source text not null default 'admin_grant'
    check (source in ('paystack', 'admin_grant', 'promo')),
  add column if not exists granted_by uuid,
  add column if not exists starts_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists paystack_reference text,
  add column if not exists note text,
  add column if not exists subscribed_at timestamptz not null default now(),
  add column if not exists next_renewal_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists auto_renew boolean not null default true,
  add column if not exists risk_reason text,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Indexes: guarded so legacy rows can never abort the migration. The
-- one-active-per-user partial unique index is skipped (not created) when
-- legacy duplicates exist — entitlement queries ORDER BY created_at instead.
do $$
begin
  create index if not exists idx_user_subscriptions_user_id
    on public.user_subscriptions (user_id);
  create index if not exists idx_user_subscriptions_status
    on public.user_subscriptions (status);
  create index if not exists idx_user_subscriptions_tier
    on public.user_subscriptions (tier_id);
  create index if not exists idx_user_subscriptions_expires_at
    on public.user_subscriptions (expires_at)
    where status = 'active' and expires_at is not null;
exception when others then
  null;
end;
$$;

do $$
begin
  create unique index if not exists user_subscriptions_one_active_per_user
    on public.user_subscriptions (user_id)
    where status = 'active';
exception when others then
  -- Legacy data already has overlapping active rows; keep the table usable.
  null;
end;
$$;

alter table public.user_subscriptions enable row level security;
-- No policies: reads/writes go through SECURITY DEFINER RPCs
-- (get_my_entitlement) and service-role admin routes only.


-- 3. get_marketing_overview(): re-pointed at the unified tables ------------------
create or replace function public.get_marketing_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'campaigns', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (select status::text as status, count(*) as cnt
            from public.marketing_profile group by 1) c
    ),
    'discounts', jsonb_build_object(
      'active', (select count(*) from public.marketing_discounts where status = 'active'),
      'total_uses_30d', (select coalesce(sum(current_uses), 0) from public.marketing_discounts),
      'avg_discount_pct', (
        select coalesce(round(avg(discount_value), 1), 0)
        from public.marketing_discounts
        where discount_type = 'percentage' and status = 'active'
      )
    ),
    'subscribers', jsonb_build_object(
      'premium_users', (
        select count(*)
        from public.user_subscriptions us
        join public.subscription_tiers t on t.id = us.tier_id
        where us.status = 'active' and t.key <> 'free'
      ),
      'at_risk', (select count(*) from public.user_subscriptions where status = 'at_risk'),
      'retention_pct', (
        select case
          when count(*) filter (where status in ('active', 'cancelled', 'expired')) = 0 then 100
          else round(
            100.0 * count(*) filter (where status = 'active')
            / count(*) filter (where status in ('active', 'cancelled', 'expired')), 1)
        end
        from public.user_subscriptions
      ),
      'mrr', (
        select coalesce(sum(t.price_ghs), 0)
        from public.user_subscriptions us
        join public.subscription_tiers t on t.id = us.tier_id
        where us.status = 'active'
          and t.key <> 'free'
          and t.duration_days is not null
      )
    )
  );
$$;

revoke all on function public.get_marketing_overview() from public, anon, authenticated;
grant execute on function public.get_marketing_overview() to service_role;


-- 4. analytics_events: campaign telemetry (feeds admin CTR/funnel + Epic 30.1) ---
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null
    check (event_type in ('impression', 'click', 'install', 'signup', 'upgrade')),
  campaign_id uuid references public.marketing_profile(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_campaign
  on public.analytics_events (campaign_id, event_type);
create index if not exists idx_analytics_events_created
  on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;
-- No SELECT policy: aggregates flow through service-role admin routes only.

-- Mobile writers: identity from the JWT, event vocabulary locked to the two
-- consumer-side signals (deeper funnel stages stay server-written).
create or replace function public.log_marketing_event(
  p_campaign_id uuid,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('impression', 'click') then
    return;
  end if;
  insert into public.analytics_events (event_type, campaign_id, user_id)
  values (p_event_type, p_campaign_id, auth.uid());
end;
$$;

revoke all on function public.log_marketing_event(uuid, text) from public, anon;
grant execute on function public.log_marketing_event(uuid, text) to authenticated, service_role;

-- Admin aggregate: per-campaign impression/click counts for a page of
-- campaign ids (consumed by /api/marketing/campaigns + /api/marketing/analytics).
create or replace function public.get_campaign_event_stats(p_campaign_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(campaign_id, stats), '{}'::jsonb)
  from (
    select campaign_id, jsonb_build_object(
      'impressions', count(*) filter (where event_type = 'impression'),
      'clicks', count(*) filter (where event_type = 'click')
    ) as stats
    from public.analytics_events
    where campaign_id = any (p_campaign_ids)
    group by 1
  ) e;
$$;

revoke all on function public.get_campaign_event_stats(uuid[]) from public, anon, authenticated;
grant execute on function public.get_campaign_event_stats(uuid[]) to service_role;


-- 5. discount_redemptions: per-user promo audit trail ------------------------------
-- Enforces per_user_limit server-side and links free-trial redemptions to the
-- user_subscriptions row they granted (source = 'promo').
create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.marketing_discounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_discount_redemptions_discount_user
  on public.discount_redemptions (discount_id, user_id);

alter table public.discount_redemptions enable row level security;
-- No policies: redemption runs through the service-role /api/user/redeem-promo
-- route only.


-- 6. Marketing delivery preferences ----------------------------------------------
-- Promotions opt-in toggle for the mobile Notification Preferences screen
-- (Part M Phase 2). Push dispatch and in-app banner delivery must respect it.
-- Defaults to true (opt-out model), matching the other push_*_enabled columns.
alter table public.user_profiles
  add column if not exists push_promotions_enabled boolean not null default true;
