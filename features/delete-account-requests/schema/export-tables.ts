/**
 * The "genuinely user-owned" tables a GDPR export walks — mirrors
 * docs/epic3-4-retention-map.md. Shared between the admin-triggered export
 * (api/export-request.ts) and the self-serve one a signed-in user can run on
 * themselves (api/self-export.ts) so the two can never drift apart.
 */

export type ExportTable =
  | { table: string; column: string }
  | { table: string; orColumns: [string, string] };

export const EXPORT_TABLES: ExportTable[] = [
  { table: "medication_enquiries", column: "user_id" },
  { table: "medication_reminders", column: "user_id" },
  { table: "medication_adherence", column: "user_id" },
  { table: "drug_interaction_flags", column: "user_id" },
  { table: "drug_verification_requests", column: "user_id" },
  { table: "period_daily_logs", column: "user_id" },
  { table: "period_cycles", column: "user_id" },
  { table: "period_consent_events", column: "user_id" },
  { table: "period_ttc_profiles", column: "user_id" },
  { table: "period_ovulation_tests", column: "user_id" },
  { table: "period_fertility_insights", column: "user_id" },
  { table: "period_notes", column: "user_id" },
  { table: "messages", column: "sender_id" },
  { table: "conversation_members", column: "user_id" },
  { table: "message_reads", column: "user_id" },
  { table: "chat_support", column: "requested_by" },
  { table: "job_applications", column: "applicant_id" },
  { table: "job_alerts", column: "user_id" },
  { table: "job_saved", column: "user_id" },
  { table: "hcp_digital_cvs", column: "user_id" },
  { table: "hcp_verifications", column: "user_id" },
  { table: "facility_reviews", column: "user_id" },
  { table: "facility_favorites", column: "user_id" },
  { table: "app_reviews", column: "user_id" },
  { table: "escrow_transactions", orColumns: ["buyer_id", "seller_id"] },
  { table: "transaction_records", column: "user_id" },
  { table: "subscription_upgrade_requests", column: "user_id" },
  { table: "user_subscriptions", column: "user_id" },
  { table: "fitness_challenge_entries", column: "user_id" },
  { table: "fitness_challenge_participants", column: "user_id" },
  { table: "fitness_user_streaks", column: "user_id" },
  { table: "fitness_health_sync_logs", column: "user_id" },
  { table: "fitness_onboarding_selections", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "user_push_tokens", column: "user_id" },
  { table: "user_notes", column: "user_id" },
  { table: "device_attestation_log", column: "user_id" },
  { table: "device_sign_in_requests", column: "user_id" },
  { table: "security_device_signals", column: "user_id" },
  { table: "analytics_events", column: "user_id" },
  { table: "challenge_views", column: "user_id" },
  { table: "condition_views", column: "user_id" },
  { table: "exercise_views", column: "user_id" },
  { table: "healthy_living_views", column: "user_id" },
  { table: "symptom_views", column: "user_id" },
  { table: "facility_scout_submissions", column: "submitted_by" },
  { table: "facility_scout_referrals", orColumns: ["referrer_id", "referred_user_id"] },
  { table: "registrars", column: "user_id" },
  { table: "collector_footprints", column: "collector_id" },
];
