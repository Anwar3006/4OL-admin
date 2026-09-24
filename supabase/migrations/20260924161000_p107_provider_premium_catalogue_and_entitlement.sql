-- P1-07 · Provider Premium and Provider Premium Plus.
--
-- Provider Premium is provider-wide. Provider Premium Plus also grants the
-- purchaser personal all-access premium, computed by get_my_entitlement(); no
-- user_subscriptions row is copied or maintained for that bridge.

alter table public.facility_subscriptions
  add column if not exists beneficiary_user_id uuid references auth.users(id) on delete set null,
  add column if not exists paystack_reference text;

create index if not exists idx_facility_subscriptions_plus_beneficiary
  on public.facility_subscriptions (beneficiary_user_id, current_period_end desc)
  where status = 'active' and beneficiary_user_id is not null;

-- The obsolete test record has no subscription rows in production. Keep the
-- delete explicit so a future FK reference fails safely rather than silently
-- changing a historic plan.
delete from public.marketing_subscriptions
where name = 'Tester Something';

insert into public.marketing_subscriptions (
  name, description, tier_type, price, period, billing_cycle, privileges,
  tier_limit, is_active
)
values
  (
    'Provider Premium',
    'Priority enquiries, paid chat, advanced analytics and demand insights for your business.',
    'provider', 79.00, '1month', 'monthly',
    array[
      'paid_chat'::public.subscription_privilege,
      'priority_enquiry_alerts'::public.subscription_privilege,
      'advanced_analytics'::public.subscription_privilege,
      'demand_insight'::public.subscription_privilege
    ],
    0, true
  ),
  (
    'Provider Premium Plus',
    'Everything in Provider Premium, plus full personal Our Life Premium for the subscribing member-provider.',
    'provider', 109.00, '1month', 'monthly',
    array[
      'paid_chat'::public.subscription_privilege,
      'priority_enquiry_alerts'::public.subscription_privilege,
      'advanced_analytics'::public.subscription_privilege,
      'demand_insight'::public.subscription_privilege,
      'consumer_full_access_bundle'::public.subscription_privilege
    ],
    0, true
  )
on conflict (name) do update set
  description = excluded.description,
  tier_type = excluded.tier_type,
  price = excluded.price,
  period = excluded.period,
  billing_cycle = excluded.billing_cycle,
  privileges = excluded.privileges,
  tier_limit = excluded.tier_limit,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
  v_provider_plus record;
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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select t.key as tier_key, t.name as tier_name, us.expires_at, us.source, us.scope
    into v_row
  from public.user_subscriptions us
  join public.subscription_tiers t on t.id = us.tier_id
  where us.user_id = auth.uid()
    and us.status = 'active'
    and (us.expires_at is null or us.expires_at > now())
  order by us.created_at desc
  limit 1;

  -- Plus is intentionally personal, despite the provider-wide subscription
  -- row. It applies only to its named purchaser and only while that account is
  -- eligible to enter both apps. Staff and provider-only accounts cannot use it.
  select fs.current_period_end, ms.name
    into v_provider_plus
  from public.facility_subscriptions fs
  join public.marketing_subscriptions ms on ms.id = fs.subscription_id
  join public.user_profiles up on up.user_id = auth.uid()
  where fs.beneficiary_user_id = auth.uid()
    and fs.status = 'active'
    and (fs.current_period_end is null or fs.current_period_end > now())
    and coalesce(up.account_types, '{}'::text[]) @> array['member', 'provider']::text[]
    and 'consumer_full_access_bundle' = any (ms.privileges::text[])
  order by fs.current_period_end desc nulls last, fs.started_at desc
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

  v_bridged := (v_row is not null and v_row.scope = 'all_access')
    or v_provider_plus is not null;

  if v_bridged then
    v_period_premium := true;
    v_period_state := 'active';
    v_period_tier := 'cycle_pro';
    v_period_source := case when v_provider_plus is not null then 'provider_premium_plus' else 'platform_bridge' end;
    v_period_expires_at := case when v_provider_plus is not null then v_provider_plus.current_period_end else v_row.expires_at end;
    v_period_days_left := case
      when v_period_expires_at is null then 0
      else greatest(0, ceil(extract(epoch from (v_period_expires_at - now())) / 86400.0))::int
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
    'is_premium', v_row is not null or v_provider_plus is not null,
    'tier_key', case when v_provider_plus is not null then 'provider_premium_plus' else coalesce(v_row.tier_key, 'free') end,
    'tier_name', case when v_provider_plus is not null then 'Provider Premium Plus' else coalesce(v_row.tier_name, 'Free') end,
    'tier_scope', case
      when v_provider_plus is not null then 'all_access'
      when v_row is null then null
      else v_row.scope
    end,
    'is_lifetime', v_provider_plus is null and v_row is not null and v_row.expires_at is null,
    'expires_at', case when v_provider_plus is not null then v_provider_plus.current_period_end when v_row is null then null else v_row.expires_at end,
    'source', case when v_provider_plus is not null then 'provider_subscription' when v_row is null then null else v_row.source end
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
$$;

revoke all on function public.get_my_entitlement() from public;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
