-- Clears the three Supabase security-advisor groups blocking release sign-off.
-- Every change here is behaviour-preserving; nothing a client can do changes.
--
-- 1. security_definer_view (ERROR x2): fitness_challenge_leaderboard and
--    fitness_challenge_team_leaderboard ran as their owner (postgres), which
--    is how they show every participant's name and score even though
--    user_profiles / fitness_challenge_entries are own-row-only under RLS.
--    Flipping them to security_invoker alone would collapse each leaderboard
--    to "just me". Instead the privileged read moves into SECURITY DEFINER
--    functions in a new, non-API-exposed `private` schema, and the views
--    (same names, same columns, so shipped builds keep working) become
--    security_invoker wrappers over them. Output is identical.
--
-- 2. rls_enabled_no_policy (INFO x65): RLS with zero policies already denies
--    anon/authenticated everything; these tables are only touched by the
--    service role and SECURITY DEFINER RPCs. An explicit `using (false)`
--    policy states that intent. Permissive, not restrictive, so a future
--    real policy still works when added.
--
-- 3. function_search_path_mutable (WARN x50): all 50 are SECURITY INVOKER.
--    Pinned to the path they already resolve with today
--    ("$user", public, extensions) with pg_temp last.
--
-- Rollback: 20260925170000_security_advisor_cleanup_ROLLBACK.sql

-- ── 1. Leaderboard views ────────────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.fitness_challenge_leaderboard_rows()
returns table (
  challenge_id uuid, participant_id uuid, user_id uuid, first_name text,
  last_name text, avatar_url text, team_id uuid, team_name text,
  total_score numeric, progress_pct numeric, status text, rank bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.challenge_id,
         p.id,
         p.user_id,
         up.first_name,
         up.last_name,
         up.avatar_url,
         p.team_id,
         t.name,
         coalesce(sum(e.value), 0::numeric),
         p.progress_pct,
         p.status,
         rank() over (partition by p.challenge_id
                      order by coalesce(sum(e.value), 0::numeric) desc)
  from public.fitness_challenge_participants p
  join public.user_profiles up on up.user_id = p.user_id
  left join public.fitness_challenge_teams t on t.id = p.team_id
  left join public.fitness_challenge_entries e on e.participant_id = p.id
  group by p.challenge_id, p.id, p.user_id, up.first_name, up.last_name,
           up.avatar_url, p.team_id, t.name, p.progress_pct, p.status
$$;

create or replace function private.fitness_challenge_team_leaderboard_rows()
returns table (
  challenge_id uuid, team_id uuid, team_name text, avatar_url text,
  member_count integer, total_score numeric, rank bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.challenge_id,
         t.id,
         t.name,
         t.avatar_url,
         t.member_count,
         coalesce(sum(e.value), 0::numeric),
         rank() over (partition by t.challenge_id
                      order by coalesce(sum(e.value), 0::numeric) desc)
  from public.fitness_challenge_teams t
  left join public.fitness_challenge_participants p on p.team_id = t.id
  left join public.fitness_challenge_entries e on e.participant_id = p.id
  group by t.challenge_id, t.id, t.name, t.avatar_url, t.member_count
$$;

revoke all on function private.fitness_challenge_leaderboard_rows() from public, anon;
revoke all on function private.fitness_challenge_team_leaderboard_rows() from public, anon;
grant execute on function private.fitness_challenge_leaderboard_rows() to authenticated, service_role;
grant execute on function private.fitness_challenge_team_leaderboard_rows() to authenticated, service_role;

-- CREATE OR REPLACE keeps the views' existing grants (authenticated only).
create or replace view public.fitness_challenge_leaderboard
with (security_invoker = true) as
  select challenge_id, participant_id, user_id, first_name, last_name,
         avatar_url, team_id, team_name, total_score,
         progress_pct::numeric(5,2) as progress_pct, status, rank
  from private.fitness_challenge_leaderboard_rows();

create or replace view public.fitness_challenge_team_leaderboard
with (security_invoker = true) as
  select challenge_id, team_id, team_name, avatar_url, member_count,
         total_score, rank
  from private.fitness_challenge_team_leaderboard_rows();

-- ── 2. Explicit deny policies ───────────────────────────────────────────────
do $p$
declare t text;
begin
  foreach t in array array[
    'admin_activity_logs',
    'admin_permissions',
    'admin_platform_roles',
    'admin_role_permissions',
    'admin_sessions',
    'admin_user_overrides',
    'ai_models',
    'ai_recommendation_stats',
    'ambulances',
    'anatomy_premium_config',
    'bed_tracker_ward_updates',
    'content_engagement',
    'device_attestation_log',
    'discount_redemptions',
    'emergency_bed_request_facilities',
    'emergency_bed_requests',
    'feature_flags',
    'finance_config',
    'finance_visibility_config',
    'fitcoin_activity_tiers',
    'fitness_content_schedule',
    'healthy_living_body_parts',
    'infra_cost_budgets',
    'job_alert_notifications',
    'job_alerts',
    'job_saved',
    'legal_holds',
    'maintenance_history',
    'map_rpc_throttle',
    'notification_automation_rules',
    'notification_templates',
    'operational_expenses',
    'period_reminder_log',
    'period_trivia_attempts',
    'pharmacy_marketing_campaigns',
    'platform_api_keys',
    'platform_broadcasts',
    'platform_integrations',
    'platform_metrics_snapshots',
    'platform_settings',
    'platform_webhooks',
    'provider_member_department_memberships',
    'provider_member_invite_departments',
    'rate_limit_counters',
    'refunds',
    'report_definitions',
    'report_delivery_logs',
    'report_metrics_snapshots',
    'report_recipients',
    'report_runs',
    'reward_catalog',
    'reward_criteria_types',
    'reward_grants',
    'reward_tiers',
    'security_device_signals',
    'security_threats',
    'service_charge_rates',
    'settings_change_log',
    'subscription_tiers',
    'tax_filings',
    'transactions',
    'whatsapp_broadcasts',
    'whatsapp_group_members',
    'whatsapp_groups',
    'whatsapp_templates'
  ] loop
    execute format(
      'create policy deny_client_access on public.%I as permissive for all '
      'to anon, authenticated using (false) with check (false)', t);
  end loop;
end $p$;

-- ── 3. Pinned search_path ──────────────────────────────────────────────────
do $f$
declare f text;
begin
  foreach f in array array[
    'public.assign_scout_submission_ref()',
    'public.cleanup_expired_otps()',
    'public.cleanup_notification_logs()',
    'public.delete_healthy_living_info(uuid)',
    'public.delete_old_notifications()',
    'public.fn_auto_complete_expired_challenge()',
    'public.fn_cascade_challenge_completion()',
    'public.fn_healthy_living_info_updated_at()',
    'public.fn_sync_challenge_participant_count()',
    'public.fn_sync_challenge_progress()',
    'public.fn_sync_facility_location()',
    'public.fn_sync_moderation_flag()',
    'public.fn_sync_team_member_count()',
    'public.fn_touch_conversation_updated_at()',
    'public.fn_trigger_refresh_fitness_dashboard()',
    'public.get_chat_tab_counts()',
    'public.get_due_medication_reminders(timestamptz)',
    'public.get_due_reminders(timestamptz)',
    'public.get_due_workout_reminders(timestamptz)',
    'public.get_fitcoins_dashboard(uuid)',
    'public.get_fitness_dashboard_kpis()',
    'public.get_flagged_content()',
    'public.get_medication_kpi_stats()',
    'public.get_streak_detail(uuid, date)',
    'public.insert_condition(jsonb, text[], text[], jsonb[], jsonb[])',
    'public.insert_healthy_living_info(text, text, text, jsonb, integer, uuid, text, jsonb)',
    'public.insert_healthy_living_info_tree(jsonb, uuid)',
    'public.maintain_condition_engagement_counters()',
    'public.next_report_run_at(text, text, integer, timestamptz)',
    'public.queue_facility_files_for_deletion()',
    'public.record_workout_completion(uuid)',
    'public.refresh_fitness_dashboard()',
    'public.register_symptom_complex(jsonb, text[], text[], jsonb[], jsonb[])',
    'public.safe_to_timestamptz(text)',
    'public.set_admin_tasks_updated_at()',
    'public.set_compliance_settings_updated_at()',
    'public.set_faqs_updated_at()',
    'public.set_marketing_discount_created_by()',
    'public.sync_analytics_event_names()',
    'public.sync_bed_tracker_ward_available()',
    'public.sync_profile_role_to_user()',
    'public.touch_updated_at()',
    'public.update_condition(uuid, jsonb, text[], text[], jsonb[], jsonb[])',
    'public.update_healthy_living_info(uuid, text, text, text, jsonb, integer, uuid, text, jsonb)',
    'public.update_marketing_statuses()',
    'public.update_symptom_complex(uuid, jsonb, text[], text[], jsonb[], jsonb[])',
    'public.update_updated_at_column()',
    'public.update_workouts_updated_at()',
    'public.validate_content_engagement_target()',
    'migration_backup.wrap_initplan(text)'
  ] loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f);
  end loop;
end $f$;
