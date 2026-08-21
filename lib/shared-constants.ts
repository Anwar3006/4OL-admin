/**
 * Shared vocabulary constants for the Gap Analysis implementation
 * (GAP_ANALYSIS_MOCKUP_VS_4OURLIFE_ADMIN.md). These mirror the mockup's
 * fixed lists and are enforced both client-side (forms/filters) and
 * server-side (zod schemas). Keep server route schemas in sync.
 */

/** Ghana's 16 administrative regions (decision E-D6 / F coverage report). */
export const GHANA_REGIONS = [
  "Ahafo Region",
  "Ashanti Region",
  "Bono Region",
  "Bono East Region",
  "Central Region",
  "Eastern Region",
  "Greater Accra Region",
  "North East Region",
  "Northern Region",
  "Oti Region",
  "Savannah Region",
  "Upper East Region",
  "Upper West Region",
  "Volta Region",
  "Western Region",
  "Western North Region",
] as const;

/**
 * Business types that must register through Facilities instead of IBP
 * (mockup m-register-ibp restricted-type validation, Part C).
 */
export const RESTRICTED_IBP_TYPES = [
  "Pharmacy",
  "Gym",
  "Herbal Clinic",
  "Clinic/Hospital",
  "Dental",
  "Wellness/Spa",
  "Home Healthcare",
  "Diagnostic Lab",
  "Mental Health",
] as const;

/** Group category vocabulary (decision E-D4 — mockup's 7 adopted). */
export const GROUP_CATEGORIES = [
  "Health Conditions",
  "HCP Professional",
  "Fitness & Wellness",
  "Medication",
  "Community Support",
  "Facility",
  "BedTracker Emergency",
] as const;

/** Migration map from the legacy codebase vocabulary (decision E-D4). */
export const LEGACY_GROUP_CATEGORY_MAP: Record<string, (typeof GROUP_CATEGORIES)[number]> = {
  general: "Community Support",
  specialty: "HCP Professional",
  facility: "Facility",
  support: "Community Support",
  announcements: "Health Conditions",
};

/** Group membership types (mockup m-create-group). */
export const GROUP_TYPES = [
  "open_all_users",
  "verified_users_only",
  "hcp_verified_only",
  "premium_users",
  "admin_only",
] as const;

/** Support ticket statuses (decision E-D1 — 5-state vocabulary). */
export const TICKET_STATUSES = [
  "Open",
  "Unread",
  "Pending",
  "Resolved",
  "Escalated",
] as const;

/** Support ticket types (mockup Support tab filter). */
export const TICKET_TYPES = [
  "Billing",
  "Technical",
  "Health Consultation",
  "Account",
  "BedTracker",
  "Other",
] as const;

/** Moderation flag reasons (mockup Flagged tab filter). */
export const FLAG_REASONS = [
  "Spam",
  "Medical Misinformation",
  "Hate Speech",
  "Harassment",
  "Off-Topic",
] as const;

/** Task Manager category vocabulary with emoji tags (Part D gap 6). */
export const TASK_CATEGORIES = [
  { value: "dev", label: "Dev", emoji: "🛠" },
  { value: "security", label: "Security", emoji: "🔐" },
  { value: "reports", label: "Reports", emoji: "📊" },
  { value: "facilities", label: "Facilities", emoji: "🏥" },
  { value: "finance", label: "Finance", emoji: "💰" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "ibp", label: "IBP", emoji: "🏢" },
  { value: "compliance", label: "Compliance", emoji: "⚖️" },
  { value: "hcp", label: "HCP", emoji: "🩺" },
  { value: "content", label: "Content", emoji: "📝" },
  { value: "admin", label: "Admin", emoji: "🧑‍💼" },
] as const;

/** Drug catalog categories — the 9 collapsed buckets (decision D1). */
export const DRUG_CATEGORIES = [
  "Antibiotics",
  "Antihypertensives & Cardiovascular",
  "Antimalarials",
  "Analgesics",
  "Antiretrovirals",
  "Antidiabetics",
  "Antifungals",
  "Vitamins & Supplements",
  "Other",
] as const;

export const DRUG_AVAILABILITY = ["otc", "rx_only", "controlled", "unknown"] as const;

export const DRUG_STATUSES = ["active", "discontinued", "under_review", "unverified"] as const;

export const INTERACTION_SEVERITIES = ["critical", "major", "moderate", "minor"] as const;

/** IBP plan tiers mirror subscription_plans (free/standard/premium/featured). */
export const IBP_PLAN_TIERS = ["free", "standard", "premium", "featured"] as const;

/** User subscription plans shown in the mockup Users tabs. */
export const USER_PLANS = ["Free", "Starter", "Pro", "Elite"] as const;

/** Format a support ticket id for display (decision E-D2 — no schema change). */
export function formatTicketId(id: number | string): string {
  const n = typeof id === "string" ? Number.parseInt(id, 10) : id;
  if (!Number.isFinite(n)) return `TKT-${id}`;
  return `TKT-${String(n).padStart(4, "0")}`;
}

/** Format a task sequence number as the mockup's T-XXX id (decision D-D6). */
export function formatTaskId(seq: number | null | undefined): string {
  if (seq == null) return "T-???";
  return `T-${String(seq).padStart(3, "0")}`;
}
