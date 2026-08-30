-- Cycle Pro (period premium) enforcement for get_my_entitlement().
--
-- The mobile app's single entitlement RPC previously read user_subscriptions
-- only. This rewrite keeps that global tier behavior unchanged and ADDS the
-- period_premium_* keys that make the admin-approved Premium rollout work
-- in-app:
--   * active grants from period_premium_grants (manual, trivia prize,
--     onboarding trial, goodwill, ...) decide period_premium;
--   * period_premium_settings drives the on-expiry behavior:
--     auto_lock_on_expiry (premium features lock when the grant lapses),
--     show_paywall_on_expiry (the upgrade sheet is offered on lock) and
--     expiry_reminder_days (how early the app warns);
--   * period_state distinguishes active / expired / revoked / never so the
--     UI can lock vs. simply not offer.
--
-- Identity still comes from the caller's JWT (auth.uid()); there is no
-- user-id parameter to spoof. SECURITY DEFINER + fixed search_path as
-- before.

create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_row record;
  v_grant record;
  v_prior record;
  v_settings record;
begin
  -- Global subscription tier (behavior unchanged from the fitness
  -- monetization migration).
  select t.key as tier_key, t.name as tier_name, us.expires_at, us.source
    into v_row
  from public.user_subscriptions us
  join public.subscription_tiers t on t.id = us.tier_id
  where us.user_id = auth.uid()
    and us.status = 'active'
    and (us.expires_at is null or us.expires_at > now())
  order by us.created_at desc
  limit 1;

  -- Active Cycle Pro grant, if any. The longest-running valid grant wins
  -- so stacked grants (trial + manual extension) overlap gracefully.
  select g.tier, g.source, g.starts_at, g.expires_at
    into v_grant
  from public.period_premium_grants g
  where g.user_id = auth.uid()
    and g.revoked_at is null
    and g.expires_at > now()
  order by g.expires_at desc
  limit 1;

  -- Most recent grant regardless of validity, to tell "expired"/"revoked"
  -- apart from "never had premium" once the active grant is gone.
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

  return jsonb_build_object(
    'is_premium', v_row is not null,
    'tier_key', coalesce(v_row.tier_key, 'free'),
    'tier_name', coalesce(v_row.tier_name, 'Free'),
    'is_lifetime', (v_row is not null and v_row.expires_at is null),
    'expires_at', case when v_row is null then null else v_row.expires_at end,
    'source', case when v_row is null then null else v_row.source end
  ) || jsonb_build_object(
    'period_premium', v_grant is not null,
    'period_state', case
      when v_grant is not null then 'active'
      when v_prior is null then 'never'
      when v_prior.was_revoked then 'revoked'
      else 'expired'
    end,
    'period_tier', case when v_grant is null then null else v_grant.tier end,
    'period_source', case when v_grant is null then null else v_grant.source end,
    'period_expires_at', case when v_grant is null then null else v_grant.expires_at end,
    'period_days_left', case
      when v_grant is null then 0
      else greatest(0, ceil(extract(epoch from (v_grant.expires_at - now())) / 86400.0))::int
    end,
    'period_auto_lock_on_expiry', coalesce(v_settings.auto_lock_on_expiry, true),
    'period_show_paywall_on_expiry', coalesce(v_settings.show_paywall_on_expiry, true),
    'period_expiry_reminder_days', coalesce(v_settings.expiry_reminder_days, 3)
  );
end;
$$;

revoke all on function public.get_my_entitlement() from public;
grant execute on function public.get_my_entitlement() to authenticated, service_role;
