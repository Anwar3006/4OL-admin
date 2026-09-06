/**
 * Shared vocabulary constants for the Chats menu (Gap Analysis Part E).
 *
 * Decision E-D4: adopt the mockup's 7 group categories. The legacy codebase
 * values are mapped in 20260820_chats_group_enrichment.sql follow-ups and in
 * GROUP_CATEGORY_LEGACY_MAP below for display normalization.
 */

export const GROUP_CATEGORIES = [
  { value: "health_conditions", label: "🩺 Health Conditions" },
  { value: "hcp_professional", label: "👨‍⚕️ HCP Professional" },
  { value: "fitness_wellness", label: "🏃 Fitness & Wellness" },
  { value: "medication", label: "💊 Medication" },
  { value: "community_support", label: "🤝 Community Support" },
  { value: "facility", label: "🏥 Facility" },
  { value: "bedtracker_emergency", label: "🚑 BedTracker Emergency" },
] as const;

export type GroupCategory = (typeof GROUP_CATEGORIES)[number]["value"];

/** Legacy → new category mapping for rows created before E-D4. */
export const GROUP_CATEGORY_LEGACY_MAP: Record<string, string> = {
  general: "community_support",
  specialty: "hcp_professional",
  facility: "facility",
  support: "community_support",
  announcements: "health_conditions",
};

export function normalizeGroupCategory(raw: string | null | undefined): string {
  if (!raw) return "community_support";
  return GROUP_CATEGORY_LEGACY_MAP[raw] ?? raw;
}

export function groupCategoryLabel(raw: string | null | undefined): string {
  const normalized = normalizeGroupCategory(raw);
  return GROUP_CATEGORIES.find((c) => c.value === normalized)?.label ?? normalized;
}

export const GROUP_TYPES = [
  { value: "open", label: "Open — All Users" },
  { value: "verified", label: "Verified Users Only" },
  { value: "hcp_verified", label: "HCP Verified Only" },
  { value: "premium", label: "Premium Users" },
  { value: "admin", label: "Admin Only" },
] as const;

export type GroupType = (typeof GROUP_TYPES)[number]["value"];

export function groupTypeLabel(raw: string | null | undefined): string {
  return GROUP_TYPES.find((t) => t.value === raw)?.label ?? raw ?? "—";
}

export const GROUP_STATUSES = ["active", "inactive", "archived"] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

/** Permission checkbox keys from m-create-group (decision E.3). */
export const GROUP_PERMISSION_OPTIONS = [
  { key: "allow_messages", label: "Members can send messages" },
  { key: "allow_media", label: "Members can share media" },
  { key: "allow_links", label: "Members can share links" },
  { key: "approval_required", label: "Admin approval for new members" },
  { key: "announcements_only", label: "Admin-only announcements" },
  { key: "moderation_alerts", label: "Send moderation alerts to admins" },
] as const;

export type GroupPermissionKey = (typeof GROUP_PERMISSION_OPTIONS)[number]["key"];

export const GROUP_PERMISSION_DEFAULTS: Record<GroupPermissionKey, boolean> = {
  allow_messages: true,
  allow_media: true,
  allow_links: true,
  approval_required: false,
  announcements_only: false,
  moderation_alerts: true,
};

/** Compact "Permissions" column summary, e.g. "Verified only · No media". */
export function groupPermissionSummary(
  permissions: Partial<Record<GroupPermissionKey, boolean>> | null | undefined,
  groupType?: string | null,
): string {
  const parts: string[] = [];
  if (groupType === "hcp_verified") parts.push("HCP only");
  else if (groupType === "verified") parts.push("Verified only");
  else if (groupType === "premium") parts.push("Premium only");
  else if (groupType === "admin") parts.push("Admin only");
  if (permissions?.allow_media === false) parts.push("No media");
  if (permissions?.allow_links === false) parts.push("No links");
  if (permissions?.announcements_only) parts.push("Announcements only");
  if (permissions?.approval_required) parts.push("Approval required");
  return parts.length ? parts.join(" · ") : "Open";
}

/** Support ticket triage vocabulary (decision E-D1). */
export const SUPPORT_STATUSES = ["Open", "Unread", "Pending", "Resolved", "Escalated"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_BADGES: Record<string, string> = {
  Open: "badge-green",
  Unread: "badge-blue",
  Pending: "badge-amber",
  Resolved: "badge-slate",
  Escalated: "badge-red",
};

export const SUPPORT_TYPES = [
  "Billing",
  "Technical",
  "Health Consultation",
  "Account",
  "BedTracker",
  "Other",
] as const;

/** Format the bigserial id as the mockup's TKT-XXXX display id (E-D2). */
export function ticketDisplayId(id: number | string | null | undefined): string {
  if (id === null || id === undefined) return "TKT-????";
  return `TKT-${String(id).padStart(4, "0")}`;
}

/** Flag reasons from the mockup's Flagged tab reason filter. */
export const FLAG_REASONS = [
  "Spam",
  "Medical Misinformation",
  "Hate Speech",
  "Harassment",
  "Off-Topic",
] as const;
