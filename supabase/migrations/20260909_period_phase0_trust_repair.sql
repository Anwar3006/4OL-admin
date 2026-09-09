-- ============================================================================
-- Plasence Phase 0 ("trust repair") — entitlement consolidation + atomic
-- period-cycle writes.
--
-- Two independent problems fixed here:
--
-- 1. cycle_pro / cycle_pro_ttc / cycle_pro_insights is collapsed to one
--    cycle_pro tier. The three variants had contradictory, overlapping
--    benefit copy (both cycle_pro_ttc and cycle_pro_insights claimed to be
--    supersets of cycle_pro while being independently priced/selectable) and
--    duplicated capability-gate logic on both sides of the wire. subscription
--    tiers are soft-disabled (is_active=false), not dropped — get_subscription_tiers()
--    already filters is_active=true, so this alone removes them from every
--    paywall list with no route/RPC change needed. Existing grants/requests
--    are backfilled to cycle_pro. request_subscription_upgrade() keeps
--    accepting the legacy tier keys (it's in CONTRACT_RPCS — an old mobile
--    build may still submit one); only period_premium_grants.tier is
--    tightened, since every NEW grant is written by this migration's era of
--    code onward.
--
-- 2. Atomic cycle + forecast writes. confirm_period_start previously ran
--    three sequential calls (upsert period_cycles, supersede the old
--    forecast, insert the new one) — not atomic, and the only mobile caller
--    was onboarding, so there was no way to log a first/past period
--    afterwards. fn_record_period_cycle() does all three in one transaction,
--    as a security definer RPC (same pattern as get_my_entitlement /
--    request_subscription_upgrade), scoped to auth.uid() internally (never a
--    passed-in user id — not spoofable). me.ts's confirm_period_start
--    becomes a thin wrapper: it still computes the prediction in TypeScript
--    (predictNextPeriod, kept in sync with the mobile port as before) and
--    passes the result in; the RPC only does the atomic write.
--
--    NOTE: an earlier draft of this migration also believed period_cycles
--    had no owner-write RLS policy and added one. It already had one —
--    owner_insert/owner_update, added same-day by
--    20260814163334_period_tracker_mobile_contract_fixes, a migration live
--    in this project's history but missing from this repo's local
--    supabase/migrations/ checkout (reconstructed here as
--    20260814163334_period_tracker_mobile_contract_fixes.sql; the local
--    migrations directory should be treated as incomplete relative to
--    production until that's audited more broadly). No RLS change is made
--    here as a result — fn_record_period_cycle's only reason to be security
--    definer is atomicity, not a missing owner grant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. Tier consolidation
-- ----------------------------------------------------------------------------

update public.period_premium_grants
  set tier = 'cycle_pro'
  where tier in ('cycle_pro_ttc', 'cycle_pro_insights');

alter table public.period_premium_grants drop constraint if exists period_premium_grants_tier_check;
alter table public.period_premium_grants
  add constraint period_premium_grants_tier_check check (tier = 'cycle_pro');

update public.subscription_upgrade_requests
  set tier_key = 'cycle_pro'
  where pass_type = 'plasence_only' and tier_key in ('cycle_pro_ttc', 'cycle_pro_insights');

update public.subscription_tiers
  set is_active = false
  where key in ('cycle_pro_ttc', 'cycle_pro_insights');

update public.subscription_tiers
  set
    description = 'Extended forecasts, full history and export, TTC and fertility tools, fertility insights, preconception checklist guidance, ovulation-test tracking, appointment planning, and deeper pattern insights with temperature-shift analysis for the Plasence tracker.',
    benefits = '["Extended 6-cycle forecasts", "Full history & export", "TTC & fertility tools", "Fertility insights", "Preconception checklist guidance", "Ovulation test tracking", "Appointment planner", "Deeper pattern insights", "Temperature shift analysis"]'::jsonb
  where key = 'cycle_pro';

-- ----------------------------------------------------------------------------
-- 1b. fn_record_period_cycle: atomic cycle + forecast write, as auth.uid().
--     Fixes the period_cycles owner-write RLS gap (security definer, same
--     pattern as get_my_entitlement/request_subscription_upgrade below).
-- ----------------------------------------------------------------------------

create or replace function public.fn_record_period_cycle(
  p_period_start_date date,
  p_period_end_date date default null,
  p_cycle_length smallint default null,
  p_period_length smallint default null,
  p_next_period_forecast date default null,
  p_ovulation_forecast date default null,
  p_fertile_window daterange default null,
  p_model_key text default 'traditional-v1',
  p_model_version text default '1.0.0',
  p_confidence numeric default null,
  p_explanation_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_cycle record;
  v_forecast record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.period_cycles (
    user_id, period_start_date, period_end_date, cycle_length, period_length,
    next_period_forecast, ovulation_forecast, fertile_window, source
  ) values (
    v_user_id, p_period_start_date, p_period_end_date, p_cycle_length, p_period_length,
    p_next_period_forecast, p_ovulation_forecast, p_fertile_window, 'user'
  )
  on conflict (user_id, period_start_date) do update set
    period_end_date = coalesce(excluded.period_end_date, public.period_cycles.period_end_date),
    cycle_length = coalesce(excluded.cycle_length, public.period_cycles.cycle_length),
    period_length = coalesce(excluded.period_length, public.period_cycles.period_length),
    next_period_forecast = excluded.next_period_forecast,
    ovulation_forecast = excluded.ovulation_forecast,
    fertile_window = excluded.fertile_window,
    updated_at = now()
  returning * into v_cycle;

  update public.period_forecasts
    set superseded_at = now()
    where user_id = v_user_id and superseded_at is null;

  insert into public.period_forecasts (
    user_id, cycle_id, model_key, model_version, predicted_period_start,
    predicted_ovulation_date, fertile_window, confidence, explanation_code
  ) values (
    v_user_id, v_cycle.id, p_model_key, p_model_version, p_next_period_forecast,
    p_ovulation_forecast, p_fertile_window, p_confidence, p_explanation_code
  )
  returning * into v_forecast;

  return jsonb_build_object(
    'cycle', to_jsonb(v_cycle),
    'forecast', to_jsonb(v_forecast)
  );
end;
$function$;

revoke all on function public.fn_record_period_cycle(date, date, smallint, smallint, date, date, daterange, text, text, numeric, text) from public, anon;
grant execute on function public.fn_record_period_cycle(date, date, smallint, smallint, date, date, daterange, text, text, numeric, text) to authenticated;

-- period_cycles already has owner_insert/owner_update (see the NOTE above) —
-- the "Period ended today" quick action's direct UPDATE, and everything
-- else here, works against those without any RLS change.
