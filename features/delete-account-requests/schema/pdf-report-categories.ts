/**
 * Human-facing grouping for the "Personal Data Access Report" PDF
 * (api/export-pdf.ts). Separate from EXPORT_TABLES (export-tables.ts), which
 * is the flat, machine list the raw JSON/zip exports walk — this file is
 * about how that same data reads to the person asking for it: section
 * titles, plain-language legal basis, and which categories are internal
 * telemetry disclosed by existence/purpose rather than dumped row-by-row.
 *
 * That distinction matters and is NOT "hide what they shouldn't know we
 * collected" — under GDPR Art. 15 / the Ghana Data Protection Act 2012
 * Section 20, a subject access request has to disclose every category of
 * personal data processed, full stop; there is no "they'd rather not know"
 * exemption, and treating this as license to omit categories from a real
 * DSAR would be the more legally exposed choice, not the safer one. What
 * genuinely is defensible — and is all `summarizeOnly` does here — is
 * disclosing a technical/security category's existence, purpose and row
 * count instead of a page of unlabelled device fingerprints and event
 * pings that mean nothing to the person reading them. Every table below
 * still appears somewhere in the report; summarizeOnly tables just don't
 * get a full row dump by default, and the report says exactly that and
 * offers the raw extract on request.
 */

import type { ExportTable } from "./export-tables";

export interface PdfCategory {
  key: string;
  title: string;
  /** One line under the section heading. */
  description: string;
  /** Plain-language legal basis shown for every row in this category, unless a row supplies its own (consent events do). */
  legalBasis: string;
  tables: ExportTable[];
  /** Existence + purpose + row count only — no row dump. See file header. */
  summarizeOnly?: boolean;
}

export const PDF_CATEGORIES: PdfCategory[] = [
  {
    key: "consent",
    title: "Consent Preferences",
    description: "Explicit choices you made about optional processing, each with the date you made them.",
    legalBasis: "Your explicit consent (withdrawable at any time in-app).",
    tables: [{ table: "period_consent_events", column: "user_id" }],
  },
  {
    key: "fitness",
    title: "Fitness Activity",
    description: "Your fitness profile, challenge participation and activity entries.",
    legalBasis: "Provided directly by you when you used the Fitness feature.",
    tables: [
      { table: "fitness_onboarding_selections", column: "user_id" },
      { table: "fitness_challenge_participants", column: "user_id" },
      { table: "fitness_challenge_entries", column: "user_id" },
      { table: "fitness_user_streaks", column: "user_id" },
      { table: "fitness_health_sync_logs", column: "user_id" },
    ],
  },
  {
    key: "period",
    title: "Period Tracker",
    description:
      "Cycle and daily-log data. Free-text notes are encrypted before they reach our servers — 4 Our Life staff cannot read their contents.",
    legalBasis: "Your explicit consent (see Consent Preferences, consent_type “tracking”).",
    tables: [
      { table: "period_daily_logs", column: "user_id" },
      { table: "period_cycles", column: "user_id" },
      { table: "period_ttc_profiles", column: "user_id" },
      { table: "period_ovulation_tests", column: "user_id" },
      { table: "period_fertility_insights", column: "user_id" },
      { table: "period_notes", column: "user_id" },
    ],
  },
  {
    key: "health",
    title: "Health & Medication",
    description: "Medication reminders, enquiries and adherence records you've logged.",
    legalBasis: "Provided directly by you when you used the Medication Reminder feature.",
    tables: [
      { table: "medication_enquiries", column: "user_id" },
      { table: "medication_reminders", column: "user_id" },
      { table: "medication_adherence", column: "user_id" },
      { table: "drug_interaction_flags", column: "user_id" },
      { table: "drug_verification_requests", column: "user_id" },
    ],
  },
  {
    key: "hcp",
    title: "Healthcare Professional Records",
    description: "Records tied to a healthcare-professional verification you submitted.",
    legalBasis: "Submitted directly by you for professional verification.",
    tables: [
      { table: "hcp_digital_cvs", column: "user_id" },
      { table: "hcp_verifications", column: "user_id" },
    ],
  },
  {
    key: "facilities",
    title: "Facilities, Reviews & Favorites",
    description: "Reviews you've written and facilities you've favorited.",
    legalBasis: "Provided directly by you.",
    tables: [
      { table: "facility_reviews", column: "user_id" },
      { table: "facility_favorites", column: "user_id" },
      { table: "app_reviews", column: "user_id" },
    ],
  },
  {
    key: "commerce",
    title: "Marketplace & Subscriptions",
    description: "Transactions, escrow activity and subscription history.",
    legalBasis: "Necessary to provide the paid service you purchased (contractual necessity).",
    tables: [
      { table: "escrow_transactions", orColumns: ["buyer_id", "seller_id"] },
      { table: "transaction_records", column: "user_id" },
      { table: "subscription_upgrade_requests", column: "user_id" },
      { table: "user_subscriptions", column: "user_id" },
    ],
  },
  {
    key: "community",
    title: "Messages & Support",
    description: "Chat messages and support requests you've sent.",
    legalBasis: "Provided directly by you.",
    tables: [
      { table: "messages", column: "sender_id" },
      { table: "conversation_members", column: "user_id" },
      { table: "message_reads", column: "user_id" },
      { table: "chat_support", column: "requested_by" },
    ],
  },
  {
    key: "jobs",
    title: "Jobs",
    description: "Job applications, saved listings and alerts.",
    legalBasis: "Provided directly by you.",
    tables: [
      { table: "job_applications", column: "applicant_id" },
      { table: "job_alerts", column: "user_id" },
      { table: "job_saved", column: "user_id" },
    ],
  },
  {
    key: "facility_scout",
    title: "Facility Scout Submissions",
    description: "Facilities you've submitted or referred for onboarding.",
    legalBasis: "Provided directly by you as a voluntary submission.",
    tables: [
      { table: "facility_scout_submissions", column: "submitted_by" },
      { table: "facility_scout_referrals", orColumns: ["referrer_id", "referred_user_id"] },
    ],
  },
  {
    key: "registrar",
    title: "Registrar Records",
    description: "Field-registrar roster and footprint data (only applies to staff/registrar accounts).",
    legalBasis: "Necessary to administer your registrar role (contractual/employment necessity).",
    tables: [
      { table: "registrars", column: "user_id" },
      { table: "collector_footprints", column: "collector_id" },
    ],
  },
  {
    key: "preferences",
    title: "App Preferences & Notifications",
    description: "Notification history, push-notification registration and personal notes.",
    legalBasis: "Necessary to operate features you've enabled.",
    tables: [
      { table: "notifications", column: "user_id" },
      { table: "user_push_tokens", column: "user_id" },
      { table: "user_notes", column: "user_id" },
    ],
  },
  {
    key: "security",
    title: "Security & Device Information",
    description:
      "Used for account security, fraud prevention and sign-in verification. Shown here by category and count, not as raw device records, since the individual entries are technical identifiers with no meaningful content on their own — the full raw extract is available on request.",
    legalBasis: "Our legitimate interest in keeping your account and this platform secure.",
    tables: [
      { table: "device_attestation_log", column: "user_id" },
      { table: "device_sign_in_requests", column: "user_id" },
      { table: "security_device_signals", column: "user_id" },
    ],
    summarizeOnly: true,
  },
  {
    key: "analytics",
    title: "Product Analytics",
    description:
      "In-app activity (screens and content viewed) used to improve the product. Shown here by category and count for the same reason as Security & Device Information above — full raw extract available on request.",
    legalBasis: "Our legitimate interest in understanding and improving the product.",
    tables: [
      { table: "analytics_events", column: "user_id" },
      { table: "challenge_views", column: "user_id" },
      { table: "condition_views", column: "user_id" },
      { table: "exercise_views", column: "user_id" },
      { table: "healthy_living_views", column: "user_id" },
      { table: "symptom_views", column: "user_id" },
    ],
    summarizeOnly: true,
  },
];
