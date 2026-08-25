-- Reconcile public.user_subscriptions between the legacy and admin contracts.
--
-- The table already existed keyed on plan_id (the older
-- marketing_subscriptions model). The Part-fitcoins and Part-marketing
-- migrations assume tier_id -> subscription_tiers, and both
-- get_my_entitlement() and get_marketing_overview() join us.tier_id.
--
-- Add the admin-side columns alongside the existing ones rather than
-- reshaping the table: plan_id keeps working for whatever reads it today,
-- tier_id serves the new RPCs. plan_id is relaxed to nullable because the
-- admin/grant path only supplies tier_id.

alter table public.user_subscriptions
  add column if not exists tier_id uuid references public.subscription_tiers(id),
  add column if not exists source text not null default 'admin_grant',
  add column if not exists granted_by uuid,
  add column if not exists starts_at timestamptz not null default now(),
  add column if not exists paystack_reference text,
  add column if not exists note text,
  add column if not exists subscribed_at timestamptz not null default now(),
  add column if not exists next_renewal_at timestamptz,
  add column if not exists risk_reason text,
  add column if not exists last_reminded_at timestamptz;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_source_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_source_check
  check (source in ('paystack', 'admin_grant', 'promo'));

alter table public.user_subscriptions
  alter column plan_id drop not null;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status is null or status in (
    'active', 'at_risk', 'cancelled', 'expired', 'revoked', 'suspended', 'pending'
  ));

create unique index if not exists user_subscriptions_one_active_per_user
  on public.user_subscriptions (user_id)
  where status = 'active';
create index if not exists idx_user_subscriptions_user_id
  on public.user_subscriptions (user_id);
create index if not exists idx_user_subscriptions_status
  on public.user_subscriptions (status);
create index if not exists idx_user_subscriptions_tier
  on public.user_subscriptions (tier_id);
create index if not exists idx_user_subscriptions_expires_at
  on public.user_subscriptions (expires_at)
  where status = 'active' and expires_at is not null;

alter table public.user_subscriptions enable row level security;
