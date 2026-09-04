-- =============================================================================
-- Scoped subscription passes (Platform All-Access / Fitness-only / Plasence-
-- only), gap-closure for the "how subscriptions actually work" audit.
--
-- Two real findings drove this:
-- 1. The documented "paid Platform Pass bridges to full Plasence access"
--    rule did not actually exist server-side — get_my_entitlement() computed
--    is_premium and period_premium fully independently. The bridge was
--    faked client-side only (mobile features/plasence/premium.ts ORing
--    is_premium into periodPremium), which meant a platform-premium user
--    saw Plasence premium screens as unlocked in the UI while their writes
--    to period_ttc_profiles etc. were silently rejected by RLS (those
--    policies check period_premium specifically). This migration makes the
--    bridge real, server-side, in get_my_entitlement() itself.
-- 2. There was no way to grant "Fitness only" (no Plasence bridge) instead
--    of "All-Access" (bridges). Scope lives on the GRANT (user_subscriptions)
--    rather than as new priced tier rows in subscription_tiers — same
--    Starter/Pro/Elite/Premium/Lifetime price ladder, admin just also picks
--    a scope. Existing rows default to 'all_access' so no current
--    subscriber's access changes.
-- =============================================================================

alter table public.user_subscriptions
  add column if not exists scope text not null default 'all_access'
    check (scope in ('all_access', 'fitness_only'));

comment on column public.user_subscriptions.scope is
  'all_access bridges to full Plasence access via get_my_entitlement(); fitness_only does not.';

-- ============================================================
-- Upgrade requests: there is no self-serve payment yet (Paystack deferred),
-- so "subscribing" on mobile means asking for a pass; an admin reviews the
-- request and performs the actual grant through the existing mechanisms
-- (POST /api/subscriptions/admin for all_access/fitness_only,
-- POST /api/period/data action=grant_premium for plasence_only).
-- ============================================================

create table if not exists public.subscription_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  pass_type text not null check (pass_type in ('all_access', 'fitness_only', 'plasence_only')),
  tier_key text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'declined', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decline_reason text
);

create index if not exists subscription_upgrade_requests_status_idx
  on public.subscription_upgrade_requests (status);
create index if not exists subscription_upgrade_requests_user_idx
  on public.subscription_upgrade_requests (user_id);

alter table public.subscription_upgrade_requests enable row level security;

drop policy if exists "own requests select" on public.subscription_upgrade_requests;
create policy "own requests select"
  on public.subscription_upgrade_requests
  for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists "own requests cancel" on public.subscription_upgrade_requests;
create policy "own requests cancel"
  on public.subscription_upgrade_requests
  for update
  to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

-- Inserts and admin review (fulfil/decline) go through
-- request_subscription_upgrade() and the service-role admin API
-- respectively — no direct client insert policy.

create or replace function public.request_subscription_upgrade(
  p_pass_type text,
  p_tier_key text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_pass_type not in ('all_access', 'fitness_only', 'plasence_only') then
    raise exception 'Invalid pass type %', p_pass_type;
  end if;

  if p_pass_type in ('all_access', 'fitness_only') and p_tier_key not in ('premium', 'lifetime') then
    raise exception 'Platform passes can only be requested for premium or lifetime';
  end if;

  if p_pass_type = 'plasence_only' and p_tier_key not in ('cycle_pro', 'cycle_pro_ttc', 'cycle_pro_insights') then
    raise exception 'Invalid Plasence tier %', p_tier_key;
  end if;

  if exists (
    select 1 from public.subscription_upgrade_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a pending request';
  end if;

  insert into public.subscription_upgrade_requests (user_id, pass_type, tier_key, note)
  values (auth.uid(), p_pass_type, p_tier_key, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.request_subscription_upgrade(text, text, text) from public, anon;
grant execute on function public.request_subscription_upgrade(text, text, text) to authenticated;

-- ============================================================
-- get_my_entitlement(): make the All-Access -> Plasence bridge real and
-- server-side. Bridge always wins over a narrower real grant (an
-- All-Access subscriber gets full Plasence, even if they also happen to
-- hold an older cycle_pro_insights-only grant record).
-- ============================================================

create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_row record;
  v_grant record;
  v_prior record;
  v_settings record;
  v_bridged boolean;
  v_period_premium boolean;
  v_period_state text;
  v_period_tier text;
  v_period_source text;
  v_period_expires_at timestamptz;
  v_period_days_left int;
begin
  select t.key as tier_key, t.name as tier_name, us.expires_at, us.source, us.scope
    into v_row
  from public.user_subscriptions us
  join public.subscription_tiers t on t.id = us.tier_id
  where us.user_id = auth.uid()
    and us.status = 'active'
    and (us.expires_at is null or us.expires_at > now())
  order by us.created_at desc
  limit 1;

  select g.tier, g.source, g.starts_at, g.expires_at
    into v_grant
  from public.period_premium_grants g
  where g.user_id = auth.uid()
    and g.revoked_at is null
    and g.expires_at > now()
  order by g.expires_at desc
  limit 1;

  select (g.revoked_at is not null) as was_revoked, g.expires_at
    into v_prior
  from public.period_premium_grants g
  where g.user_id = auth.uid()
  order by g.created_at desc
  limit 1;

  select s.onboarding_trial_days, s.auto_lock_on_expiry,
         s.show_paywall_on_expiry, s.expiry_reminder_days
    into v_settings
  from public.period_premium_settings s
  where s.id = 1;

  v_bridged := v_row is not null and v_row.scope = 'all_access';

  if v_bridged then
    v_period_premium := true;
    v_period_state := 'active';
    v_period_tier := 'cycle_pro';
    v_period_source := 'platform_bridge';
    v_period_expires_at := v_row.expires_at;
    v_period_days_left := case
      when v_row.expires_at is null then 0
      else greatest(0, ceil(extract(epoch from (v_row.expires_at - now())) / 86400.0))::int
    end;
  elsif v_grant is not null then
    v_period_premium := true;
    v_period_state := 'active';
    v_period_tier := v_grant.tier;
    v_period_source := v_grant.source;
    v_period_expires_at := v_grant.expires_at;
    v_period_days_left := greatest(0, ceil(extract(epoch from (v_grant.expires_at - now())) / 86400.0))::int;
  else
    v_period_premium := false;
    v_period_state := case
      when v_prior is null then 'never'
      when v_prior.was_revoked then 'revoked'
      else 'expired'
    end;
    v_period_tier := null;
    v_period_source := null;
    v_period_expires_at := null;
    v_period_days_left := 0;
  end if;

  return jsonb_build_object(
    'is_premium', v_row is not null,
    'tier_key', coalesce(v_row.tier_key, 'free'),
    'tier_name', coalesce(v_row.tier_name, 'Free'),
    'tier_scope', case when v_row is null then null else v_row.scope end,
    'is_lifetime', (v_row is not null and v_row.expires_at is null),
    'expires_at', case when v_row is null then null else v_row.expires_at end,
    'source', case when v_row is null then null else v_row.source end
  ) || jsonb_build_object(
    'period_premium', v_period_premium,
    'period_state', v_period_state,
    'period_tier', v_period_tier,
    'period_source', v_period_source,
    'period_expires_at', v_period_expires_at,
    'period_days_left', v_period_days_left,
    'period_auto_lock_on_expiry', coalesce(v_settings.auto_lock_on_expiry, true),
    'period_show_paywall_on_expiry', coalesce(v_settings.show_paywall_on_expiry, true),
    'period_expiry_reminder_days', coalesce(v_settings.expiry_reminder_days, 3)
  );
end;
$function$;
