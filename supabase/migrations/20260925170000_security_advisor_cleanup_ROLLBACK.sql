-- Rollback for 20260925170000_security_advisor_cleanup.sql

-- 3. search_path
alter function public.assign_scout_submission_ref() reset search_path;
alter function public.cleanup_expired_otps() reset search_path;
alter function public.cleanup_notification_logs() reset search_path;
alter function public.delete_healthy_living_info(uuid) reset search_path;
alter function public.delete_old_notifications() reset search_path;
alter function public.fn_auto_complete_expired_challenge() reset search_path;
alter function public.fn_cascade_challenge_completion() reset search_path;
alter function public.fn_healthy_living_info_updated_at() reset search_path;
alter function public.fn_sync_challenge_participant_count() reset search_path;
alter function public.fn_sync_challenge_progress() reset search_path;
alter function public.fn_sync_facility_location() reset search_path;
alter function public.fn_sync_moderation_flag() reset search_path;
alter function public.fn_sync_team_member_count() reset search_path;
alter function public.fn_touch_conversation_updated_at() reset search_path;
alter function public.fn_trigger_refresh_fitness_dashboard() reset search_path;
alter function public.get_chat_tab_counts() reset search_path;
alter function public.get_due_medication_reminders(timestamptz) reset search_path;
alter function public.get_due_reminders(timestamptz) reset search_path;
alter function public.get_due_workout_reminders(timestamptz) reset search_path;
alter function public.get_fitcoins_dashboard(uuid) reset search_path;
alter function public.get_fitness_dashboard_kpis() reset search_path;
alter function public.get_flagged_content() reset search_path;
alter function public.get_medication_kpi_stats() reset search_path;
alter function public.get_streak_detail(uuid, date) reset search_path;
alter function public.insert_condition(jsonb, text[], text[], jsonb[], jsonb[]) reset search_path;
alter function public.insert_healthy_living_info(text, text, text, jsonb, integer, uuid, text, jsonb) reset search_path;
alter function public.insert_healthy_living_info_tree(jsonb, uuid) reset search_path;
alter function public.maintain_condition_engagement_counters() reset search_path;
alter function public.next_report_run_at(text, text, integer, timestamptz) reset search_path;
alter function public.queue_facility_files_for_deletion() reset search_path;
alter function public.record_workout_completion(uuid) reset search_path;
alter function public.refresh_fitness_dashboard() reset search_path;
alter function public.register_symptom_complex(jsonb, text[], text[], jsonb[], jsonb[]) reset search_path;
alter function public.safe_to_timestamptz(text) reset search_path;
alter function public.set_admin_tasks_updated_at() reset search_path;
alter function public.set_compliance_settings_updated_at() reset search_path;
alter function public.set_faqs_updated_at() reset search_path;
alter function public.set_marketing_discount_created_by() reset search_path;
alter function public.sync_analytics_event_names() reset search_path;
alter function public.sync_bed_tracker_ward_available() reset search_path;
alter function public.sync_profile_role_to_user() reset search_path;
alter function public.touch_updated_at() reset search_path;
alter function public.update_condition(uuid, jsonb, text[], text[], jsonb[], jsonb[]) reset search_path;
alter function public.update_healthy_living_info(uuid, text, text, text, jsonb, integer, uuid, text, jsonb) reset search_path;
alter function public.update_marketing_statuses() reset search_path;
alter function public.update_symptom_complex(uuid, jsonb, text[], text[], jsonb[], jsonb[]) reset search_path;
alter function public.update_updated_at_column() reset search_path;
alter function public.update_workouts_updated_at() reset search_path;
alter function public.validate_content_engagement_target() reset search_path;
alter function migration_backup.wrap_initplan(text) reset search_path;

-- 2. deny policies
drop policy if exists deny_client_access on public.admin_activity_logs;
drop policy if exists deny_client_access on public.admin_permissions;
drop policy if exists deny_client_access on public.admin_platform_roles;
drop policy if exists deny_client_access on public.admin_role_permissions;
drop policy if exists deny_client_access on public.admin_sessions;
drop policy if exists deny_client_access on public.admin_user_overrides;
drop policy if exists deny_client_access on public.ai_models;
drop policy if exists deny_client_access on public.ai_recommendation_stats;
drop policy if exists deny_client_access on public.ambulances;
drop policy if exists deny_client_access on public.anatomy_premium_config;
drop policy if exists deny_client_access on public.bed_tracker_ward_updates;
drop policy if exists deny_client_access on public.content_engagement;
drop policy if exists deny_client_access on public.device_attestation_log;
drop policy if exists deny_client_access on public.discount_redemptions;
drop policy if exists deny_client_access on public.emergency_bed_request_facilities;
drop policy if exists deny_client_access on public.emergency_bed_requests;
drop policy if exists deny_client_access on public.feature_flags;
drop policy if exists deny_client_access on public.finance_config;
drop policy if exists deny_client_access on public.finance_visibility_config;
drop policy if exists deny_client_access on public.fitcoin_activity_tiers;
drop policy if exists deny_client_access on public.fitness_content_schedule;
drop policy if exists deny_client_access on public.healthy_living_body_parts;
drop policy if exists deny_client_access on public.infra_cost_budgets;
drop policy if exists deny_client_access on public.job_alert_notifications;
drop policy if exists deny_client_access on public.job_alerts;
drop policy if exists deny_client_access on public.job_saved;
drop policy if exists deny_client_access on public.legal_holds;
drop policy if exists deny_client_access on public.maintenance_history;
drop policy if exists deny_client_access on public.map_rpc_throttle;
drop policy if exists deny_client_access on public.notification_automation_rules;
drop policy if exists deny_client_access on public.notification_templates;
drop policy if exists deny_client_access on public.operational_expenses;
drop policy if exists deny_client_access on public.period_reminder_log;
drop policy if exists deny_client_access on public.period_trivia_attempts;
drop policy if exists deny_client_access on public.pharmacy_marketing_campaigns;
drop policy if exists deny_client_access on public.platform_api_keys;
drop policy if exists deny_client_access on public.platform_broadcasts;
drop policy if exists deny_client_access on public.platform_integrations;
drop policy if exists deny_client_access on public.platform_metrics_snapshots;
drop policy if exists deny_client_access on public.platform_settings;
drop policy if exists deny_client_access on public.platform_webhooks;
drop policy if exists deny_client_access on public.provider_member_department_memberships;
drop policy if exists deny_client_access on public.provider_member_invite_departments;
drop policy if exists deny_client_access on public.rate_limit_counters;
drop policy if exists deny_client_access on public.refunds;
drop policy if exists deny_client_access on public.report_definitions;
drop policy if exists deny_client_access on public.report_delivery_logs;
drop policy if exists deny_client_access on public.report_metrics_snapshots;
drop policy if exists deny_client_access on public.report_recipients;
drop policy if exists deny_client_access on public.report_runs;
drop policy if exists deny_client_access on public.reward_catalog;
drop policy if exists deny_client_access on public.reward_criteria_types;
drop policy if exists deny_client_access on public.reward_grants;
drop policy if exists deny_client_access on public.reward_tiers;
drop policy if exists deny_client_access on public.security_device_signals;
drop policy if exists deny_client_access on public.security_threats;
drop policy if exists deny_client_access on public.service_charge_rates;
drop policy if exists deny_client_access on public.settings_change_log;
drop policy if exists deny_client_access on public.subscription_tiers;
drop policy if exists deny_client_access on public.tax_filings;
drop policy if exists deny_client_access on public.transactions;
drop policy if exists deny_client_access on public.whatsapp_broadcasts;
drop policy if exists deny_client_access on public.whatsapp_group_members;
drop policy if exists deny_client_access on public.whatsapp_groups;
drop policy if exists deny_client_access on public.whatsapp_templates;

-- 1. views back to their original owner-rights definitions
create or replace view public.fitness_challenge_leaderboard with (security_invoker = false) as
 SELECT p.challenge_id, p.id AS participant_id, p.user_id, up.first_name, up.last_name, up.avatar_url,
    p.team_id, t.name AS team_name, COALESCE(sum(e.value), (0)::numeric) AS total_score,
    p.progress_pct, p.status,
    rank() OVER (PARTITION BY p.challenge_id ORDER BY COALESCE(sum(e.value), (0)::numeric) DESC) AS rank
   FROM fitness_challenge_participants p
     JOIN user_profiles up ON up.user_id = p.user_id
     LEFT JOIN fitness_challenge_teams t ON t.id = p.team_id
     LEFT JOIN fitness_challenge_entries e ON e.participant_id = p.id
  GROUP BY p.challenge_id, p.id, p.user_id, up.first_name, up.last_name, up.avatar_url, p.team_id, t.name, p.progress_pct, p.status;

create or replace view public.fitness_challenge_team_leaderboard with (security_invoker = false) as
 SELECT t.challenge_id, t.id AS team_id, t.name AS team_name, t.avatar_url, t.member_count,
    COALESCE(sum(e.value), (0)::numeric) AS total_score,
    rank() OVER (PARTITION BY t.challenge_id ORDER BY COALESCE(sum(e.value), (0)::numeric) DESC) AS rank
   FROM fitness_challenge_teams t
     LEFT JOIN fitness_challenge_participants p ON p.team_id = t.id
     LEFT JOIN fitness_challenge_entries e ON e.participant_id = p.id
  GROUP BY t.challenge_id, t.id, t.name, t.avatar_url, t.member_count;

drop function if exists private.fitness_challenge_leaderboard_rows();
drop function if exists private.fitness_challenge_team_leaderboard_rows();
drop schema if exists private;
