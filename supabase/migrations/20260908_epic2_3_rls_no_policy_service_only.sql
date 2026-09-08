-- Epic 2.3 (TASKS.md): classify the 56 RLS-enabled-no-policy tables.
--
-- Verified for every one of the 56 (grep across both the admin and mobile
-- repos, plus pg_proc bodies for RPC-mediated access): none are read
-- directly by a browser/server client or by mobile under RLS. 45 are read
-- only via app/api/** + features/**/api/** routes using getAdminClient()
-- (service_role, bypasses RLS by design). 10 more (admin_permissions,
-- device_attestation_log, job_alerts, job_saved, map_rpc_throttle,
-- platform_broadcasts, platform_metrics_snapshots, rate_limit_counters,
-- security_device_signals, whatsapp_group_members) have no direct .from()
-- caller in either repo but are populated/read through SECURITY DEFINER
-- RPCs (get_job_alert, get_saved_jobs, toggle_job_saved, upsert_job_alert,
-- check_and_increment_rate_limit, get_effective_admin_permissions,
-- get_facilities_map, log_device_attestation, report_device_signal,
-- get_whatsapp_stats), which run as the function owner regardless of the
-- caller's own table grants. anatomy_premium_config is both (admin API +
-- get_anatomy_premium_config RPC). None of this is the "silently broken
-- feature" shape (healthy_living_body_parts, fitness_body_parts,
-- drug_body_parts) -- every one of the 56 is a deliberate service-only
-- surface, just never had its grants tightened to match.
--
-- Decision: service-only for all 56. Keep zero client RLS policy (nothing
-- needs one) and revoke the table-level grants -- Supabase's default
-- schema privileges had left every one of them fully CRUD-grantable to
-- anon and authenticated, neutralized only by RLS having no matching
-- policy. That's a latent risk (one careless permissive policy later would
-- reopen full read/write to anon), not a live one -- revoking now removes
-- it without changing any current behavior, since RLS already returns
-- zero rows/rejects all writes for these roles today. Verified: SECURITY
-- DEFINER RPCs (e.g. check_and_increment_rate_limit, get_saved_jobs) run
-- as the function owner and are unaffected by the caller's own table
-- grants -- confirmed still callable as `authenticated` after this revoke.

revoke all on table
  public.admin_activity_logs, public.admin_permissions, public.admin_platform_roles,
  public.admin_role_permissions, public.admin_sessions, public.admin_user_overrides,
  public.ai_models, public.ai_recommendation_stats, public.ambulances,
  public.anatomy_premium_config, public.bed_tracker_ward_updates, public.bed_tracker_wards,
  public.content_engagement, public.device_attestation_log, public.discount_redemptions,
  public.facility_scout_config, public.facility_scout_submissions, public.feature_flags,
  public.finance_config, public.finance_visibility_config, public.fitcoin_activity_tiers,
  public.fitness_content_schedule, public.healthy_living_body_parts, public.infra_cost_budgets,
  public.job_alerts, public.job_saved, public.maintenance_history, public.map_rpc_throttle,
  public.notification_automation_rules, public.notification_templates, public.operational_expenses,
  public.pharmacy_marketing_campaigns, public.platform_api_keys, public.platform_broadcasts,
  public.platform_integrations, public.platform_metrics_snapshots, public.platform_settings,
  public.platform_webhooks, public.rate_limit_counters, public.refunds, public.report_definitions,
  public.report_delivery_logs, public.report_metrics_snapshots, public.report_recipients,
  public.report_runs, public.security_device_signals, public.security_threats,
  public.service_charge_rates, public.settings_change_log, public.subscription_tiers,
  public.tax_filings, public.transactions, public.whatsapp_broadcasts,
  public.whatsapp_group_members, public.whatsapp_groups, public.whatsapp_templates
from anon, authenticated;
