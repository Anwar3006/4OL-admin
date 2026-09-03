-- Phase 2 of the pre-launch subscription audit: consolidate the Fitness
-- "users" data model. public.fitness_users was found to be a vestigial
-- table (0 rows; the mobile app's onboarding wizard never wrote to it --
-- real onboarding data lands in fitness_onboarding_selections instead).
--
-- It was not, however, harmless: two live dashboard KPIs still counted
-- `fitness_users` directly and were silently stuck at 0 as a result --
-- confirmed live before this migration:
--   get_platform_overview_metrics('30') -> fitness.fitness_users = 0
--   fitness_dashboard_cache.kpi_payload -> metrics.total_fitness_users = 0
-- The correct canonical "who is a fitness user" resolver already exists
-- (public.fitness_member_ids(), used correctly by get_fitness_users() /
-- the admin Fitness > Users tab) -- it unions fitness_onboarding_selections,
-- fitness_user_assignments, exercise_sessions and fitness_users, so an
-- empty fitness_users table never changed its result. This migration
-- points the two remaining KPI functions at the same resolver and adds
-- the dashboard-refresh trigger that should have existed on the table
-- mobile actually writes to, then drops the dead table.

-- ============================================================
-- 0. The canonical resolver itself still unions in fitness_users --
--    harmless while it was empty, but must drop before the table does.
-- ============================================================
create or replace function public.fitness_member_ids()
 returns table(user_id uuid, first_seen timestamp with time zone)
 language sql
 stable
 set search_path to 'public'
as $function$
  select user_id, min(first_seen) as first_seen
  from (
    select user_id, created_at as first_seen from public.fitness_onboarding_selections
    union all
    select user_id, started_at  as first_seen from public.fitness_user_assignments
    union all
    select user_id, start_time  as first_seen from public.exercise_sessions
  ) engagement
  where user_id is not null
  group by user_id;
$function$;

-- ============================================================
-- 1. Platform Overview dashboard KPI
-- ============================================================
create or replace function public.get_platform_overview_metrics(time_filter text default '30'::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  now_at timestamptz := now();
  start_at timestamptz;
  previous_start_at timestamptz;
  window_length interval;
begin
  if lower(coalesce(time_filter, '30')) in ('7', '7d', 'last_7_days') then
    start_at := now_at - interval '7 days';
  elsif lower(coalesce(time_filter, '30')) in ('90', '90d', 'last_90_days') then
    start_at := now_at - interval '90 days';
  elsif lower(coalesce(time_filter, '30')) in ('year', 'ytd', 'this_year') then
    start_at := date_trunc('year', now_at);
  else
    start_at := now_at - interval '30 days';
  end if;

  window_length := now_at - start_at;
  previous_start_at := start_at - window_length;

  return (
    with
      user_counts as (
        select
          count(*)::int as total,
          count(*) filter (where deleted_at is null)::int as active_records,
          count(*) filter (where status = 'active')::int as active,
          count(*) filter (where status = 'pending_verification')::int as pending_verification,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from user_profiles
      ),
      facility_counts as (
        select
          count(*)::int as total,
          count(*) filter (where status::text in ('approved', 'active'))::int as active,
          count(*) filter (where status::text = 'pending')::int as pending,
          count(*) filter (where status::text = 'rejected')::int as rejected,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from facility_profile
      ),
      content_counts as (
        select
          (select count(*)::int from conditions) as conditions,
          (select count(*)::int from symptoms) as symptoms,
          (select count(*)::int from categories) as categories,
          (select count(*)::int from healthy_living_info) as healthy_living,
          (select count(*)::int from faqs where status = 'published') as active_faqs
      ),
      fitness_counts as (
        select
          (select count(*)::int from public.fitness_member_ids()) as fitness_users,
          (select count(*)::int from fitness_user_assignments where status = 'active') as active_plans,
          (select count(*)::int from fitness_challenges where status::text in ('active', 'published', 'ongoing')) as live_challenges,
          (select count(*)::int from fitness_exercises where status = 'published') as exercise_library,
          (select count(*)::int from fitness_generated_workouts) as ai_generated_workouts
      ),
      queue_counts as (
        select
          (select count(*)::int from facility_profile where status::text = 'pending') as pending_facilities,
          (select count(*)::int from delete_account_requests where status = 'pending') as pending_delete_requests,
          (select count(*)::int from hcp_verifications where verification_status in ('pending', 'under_review')) as pending_hcp_verifications,
          (select count(*)::int from collector_submissions where status in ('pending', 'needs_review')) as pending_facility_scout_submissions,
          (select count(*)::int from bed_tracker_alerts where is_resolved = false) as active_bed_alerts,
          (select count(*)::int from security_threats where status::text in ('open', 'investigating')) as open_security_threats,
          (select count(*)::int from content_moderation_flags where status::text in ('pending', 'under_review', 'pending_review')) as pending_moderation_flags
      ),
      operational_counts as (
        select
          (select count(*)::int from notification_campaigns) as notification_campaigns,
          (select count(*)::int from notifications) as notifications,
          (select count(*)::int from hcp_verifications) as hcp_verifications,
          (select count(*)::int from hcp_verifications where verification_status = 'verified') as verified_hcps,
          (select count(*)::int from job_postings) as job_postings,
          (select count(*)::int from job_applications) as job_applications,
          (select count(*)::int from bed_tracker_facilities) as bedtracker_facilities,
          (select coalesce(sum(available_beds), 0)::int from bed_tracker_facilities) as available_beds,
          (select count(*)::int from collector_submissions) as facility_scout_submissions
      ),
      finance_counts as (
        select
          count(*)::int as transactions,
          coalesce(sum(amount) filter (where status = 'completed'), 0)::numeric as revenue,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from transaction_records
      ),
      subscription_counts as (
        select
          count(*)::int as subscriptions,
          count(*) filter (where status = 'active')::int as active_subscriptions,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from user_subscriptions
      ),
      ai_counts as (
        select
          count(*)::int as calls,
          count(*) filter (where created_at >= now_at - interval '1 day')::int as calls_last_24h,
          coalesce(sum(estimated_cost), 0)::numeric as estimated_cost,
          count(*) filter (where created_at >= start_at)::int as current_period,
          count(*) filter (where created_at >= previous_start_at and created_at < start_at)::int as previous_period
        from fitness_ai_calls
      ),
      regional_facilities as (
        select coalesce(
          jsonb_object_agg(region::text, total order by region::text),
          '{}'::jsonb
        ) as by_region
        from (
          select region, count(*)::int as total
          from facility_profile
          group by region
        ) grouped
      ),
      recent_activity as (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'actor_name', actor_name,
              'action_type', action_type,
              'target_table', target_table,
              'record_id', record_id,
              'created_at', created_at
            )
            order by created_at desc
          ),
          '[]'::jsonb
        ) as rows
        from (
          select id, actor_name, action_type, target_table, record_id, created_at
          from activity_logs
          order by created_at desc
          limit 10
        ) activity
      )
    select jsonb_build_object(
      'time_filter', coalesce(time_filter, '30'),
      'window', jsonb_build_object(
        'start_at', start_at,
        'end_at', now_at,
        'previous_start_at', previous_start_at
      ),
      'kpis', jsonb_build_object(
        'total_users', user_counts.total,
        'facilities', facility_counts.total,
        'revenue_mtd', case when finance_counts.transactions = 0 then null else finance_counts.revenue end,
        'transactions', finance_counts.transactions,
        'ai_queries_last_24h', ai_counts.calls_last_24h,
        'premium_subscriptions', subscription_counts.active_subscriptions,
        'hcps', operational_counts.hcp_verifications,
        'security_score', null
      ),
      'deltas', jsonb_build_object(
        'users', jsonb_build_object(
          'current', user_counts.current_period,
          'previous', user_counts.previous_period,
          'percent', case when user_counts.previous_period = 0 then null else round(((user_counts.current_period - user_counts.previous_period)::numeric / user_counts.previous_period) * 100, 1) end
        ),
        'facilities', jsonb_build_object(
          'current', facility_counts.current_period,
          'previous', facility_counts.previous_period,
          'percent', case when facility_counts.previous_period = 0 then null else round(((facility_counts.current_period - facility_counts.previous_period)::numeric / facility_counts.previous_period) * 100, 1) end
        ),
        'transactions', jsonb_build_object(
          'current', finance_counts.current_period,
          'previous', finance_counts.previous_period,
          'percent', case when finance_counts.previous_period = 0 then null else round(((finance_counts.current_period - finance_counts.previous_period)::numeric / finance_counts.previous_period) * 100, 1) end
        ),
        'subscriptions', jsonb_build_object(
          'current', subscription_counts.current_period,
          'previous', subscription_counts.previous_period,
          'percent', case when subscription_counts.previous_period = 0 then null else round(((subscription_counts.current_period - subscription_counts.previous_period)::numeric / subscription_counts.previous_period) * 100, 1) end
        ),
        'ai_calls', jsonb_build_object(
          'current', ai_counts.current_period,
          'previous', ai_counts.previous_period,
          'percent', case when ai_counts.previous_period = 0 then null else round(((ai_counts.current_period - ai_counts.previous_period)::numeric / ai_counts.previous_period) * 100, 1) end
        )
      ),
      'users', to_jsonb(user_counts),
      'facilities', jsonb_build_object(
        'total', facility_counts.total,
        'active', facility_counts.active,
        'pending', facility_counts.pending,
        'rejected', facility_counts.rejected,
        'by_region', regional_facilities.by_region
      ),
      'content', to_jsonb(content_counts),
      'fitness', to_jsonb(fitness_counts),
      'queues', to_jsonb(queue_counts),
      'operations', to_jsonb(operational_counts),
      'finance', jsonb_build_object(
        'transactions', finance_counts.transactions,
        'revenue', case when finance_counts.transactions = 0 then null else finance_counts.revenue end,
        'revenue_status', case when finance_counts.transactions = 0 then 'awaiting_transaction_pipeline' else 'live' end
      ),
      'subscriptions', to_jsonb(subscription_counts),
      'ai', to_jsonb(ai_counts),
      'activity', recent_activity.rows,
      'unsupported', jsonb_build_object(
        'feature_usage', null,
        'security_score', null,
        'compliance_gra', null,
        'vat_filing_status', null,
        'push_delivery_rate', null,
        'user_region_distribution', null
      )
    )
    from user_counts, facility_counts, content_counts, fitness_counts,
      queue_counts, operational_counts, finance_counts, subscription_counts,
      ai_counts, regional_facilities, recent_activity
  );
end;
$function$;

-- ============================================================
-- 2. Fitness dashboard cache KPI
-- ============================================================
create or replace function public.refresh_fitness_dashboard()
 returns void
 language plpgsql
as $function$
declare
    final_payload jsonb;
begin
    with
    scalars as (
        select
            (select count(*) from public.fitness_member_ids()) as total_fitness_users,
            (select count(*) from fitness_user_assignments where status = 'active') as active_plans,
            (select count(*) from fitness_challenges where status = 'active') as live_challenges,
            (select count(*) from fitness_exercises where is_active = true and status = 'published') as exercise_library_count,
            (select coalesce(sum(amount), 0) from app_ledger where category = 'fitness' and amount > 0) as fitcoins_issued,
            (select count(*) from fitness_plans where author_type = 'ai') as ai_generated_plans,
            (select count(*) from exercise_sessions where status = 'in_progress') as active_workouts,
            (select coalesce(avg(progress_pct), 0)::int from fitness_challenge_participants where status = 'active') as avg_streak,
            (select coalesce(
                (select count(*)::numeric from exercise_sessions where status = 'completed') /
                nullif((select count(*) from exercise_sessions), 0) * 100,
                0
            )::int) as avg_completion
    ),
    top_challenges as (
        select coalesce(jsonb_agg(row_to_json(tc)), '[]'::jsonb) as data
        from (
            select id, title, current_participants
            from fitness_challenges
            where status = 'active'
            order by current_participants desc
            limit 5
        ) tc
    ),
    top_plans as (
        select coalesce(jsonb_agg(row_to_json(tp)), '[]'::jsonb) as data
        from (
            select
                fua.plan_id,
                fp.title,
                count(*) as usage_count
            from fitness_user_assignments fua
            join fitness_plans fp on fp.id = fua.plan_id
            where fua.status = 'active'
            group by fua.plan_id, fp.title
            order by usage_count desc
            limit 5
        ) tp
    ),
    leaderboard as (
        select coalesce(jsonb_agg(row_to_json(lb)), '[]'::jsonb) as data
        from (
            select user_id, score, rank_position
            from fitness_leaderboards
            where period = 'all_time'
            order by rank_position asc
            limit 5
        ) lb
    ),
    top_exercises as (
        select coalesce(jsonb_agg(row_to_json(te)), '[]'::jsonb) as data
        from (
            select
                el.exercise_id,
                fe.exercise_name as name,
                count(*) as completion_count
            from exercise_logs el
            join fitness_exercises fe on fe.id = el.exercise_id
            group by el.exercise_id, fe.exercise_name
            order by completion_count desc
            limit 5
        ) te
    )

    select jsonb_build_object(
        'metrics', (select row_to_json(s) from scalars s),
        'top_challenges', (select data from top_challenges),
        'most_used_plans', (select data from top_plans),
        'fitcoin_leaderboard', (select data from leaderboard),
        'top_exercises', (select data from top_exercises)
    ) into final_payload;

    update fitness_dashboard_cache
    set
        kpi_payload = final_payload,
        last_updated = now()
    where id = 1;

end;
$function$;

-- ============================================================
-- 3. Wire the dashboard refresh to the table mobile actually writes to.
--    fitness_users had a refresh trigger; fitness_onboarding_selections
--    (the real per-user onboarding-completion event) never did.
-- ============================================================
create trigger trg_refresh_dashboard_on_fitness_onboarding
  after insert on public.fitness_onboarding_selections
  for each row execute function public.fn_trigger_refresh_fitness_dashboard();

-- ============================================================
-- 4. Retire the dead table. 0 rows; every live reader has been
--    redirected to public.fitness_member_ids() above (get_fitness_users()
--    already was). Drops its own trigger, RLS policies and FKs with it.
-- ============================================================
drop table if exists public.fitness_users;

-- Refresh the caches once now so the corrected counts are visible
-- immediately rather than waiting for the next write event.
select public.refresh_fitness_dashboard();
