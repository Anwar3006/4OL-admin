-- Rollback for 20260924161000_p107_provider_premium_catalogue_and_entitlement.sql
-- This restores the pre-P1-07 entitlement function and removes the catalogue.
-- It refuses to discard a purchaser link once live Plus subscriptions exist.

do $$
begin
  if exists (
    select 1 from public.facility_subscriptions where beneficiary_user_id is not null
  ) then
    raise exception 'Cannot roll back P1-07 while Plus purchaser links exist';
  end if;
end;
$$;

delete from public.marketing_subscriptions
where name in ('Provider Premium', 'Provider Premium Plus');

drop index if exists public.idx_facility_subscriptions_plus_beneficiary;
alter table public.facility_subscriptions
  drop column if exists paystack_reference,
  drop column if exists beneficiary_user_id;

create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.get_my_entitlement() from public;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
