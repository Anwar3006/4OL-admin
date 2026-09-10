-- ============================================================================
-- Plasence Phase 2 — prediction-accuracy instrumentation.
--
-- period_forecasts.confirmed_period_start / absolute_error_days have existed
-- since the table was first created but were never populated by any code
-- path (features/period/api/me.ts's SELECT list for this table explicitly
-- excludes both columns; period-calculator.ts has an explicit comment
-- noting confidence "omits a recent-prediction-accuracy factor... until
-- predictions have run at least once" — v1 never closed that loop).
--
-- fn_record_period_cycle already supersedes the prior active forecast every
-- time a new period start lands; this backfills confirmed_period_start and
-- absolute_error_days on that forecast in the same statement, using the new
-- period_start_date as the "actual" the old prediction is being checked
-- against. This is instrumentation, not a finished validation study — the
-- product audit's "prospective validation... before making accuracy claims"
-- is inherently a weeks/months, real-usage process; this just makes it
-- measurable going forward instead of leaving the columns permanently null.
-- ============================================================================

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

  -- Score the forecast(s) this period start confirms/refutes before
  -- superseding them — predicted_period_start vs the real start date just
  -- recorded above.
  update public.period_forecasts
    set
      confirmed_period_start = p_period_start_date,
      -- date - date is already an integer day count in Postgres (not an
      -- interval) — no extract() needed.
      absolute_error_days = abs(predicted_period_start - p_period_start_date),
      superseded_at = now()
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
