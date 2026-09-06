/**
 * Shared IBP constants (Gap Analysis Part C).
 *
 * Health-facility business types are restricted from IBP registration —
 * they must register through the Facilities module instead. Checked on the
 * client (register form warning) and the server (zod refine in /api/ibp).
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

export type RestrictedIbpType = (typeof RESTRICTED_IBP_TYPES)[number];

export const RESTRICTED_TYPE_WARNING =
  "This business type is restricted to Facilities registration (health facilities). " +
  "IBP registration will be rejected.";

/** Case-insensitive restricted-type check used by client + server. */
export function isRestrictedIbpType(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return RESTRICTED_IBP_TYPES.some((t) => t.toLowerCase() === normalized);
}

export const IBP_PLAN_TIERS = ["free", "standard", "premium", "featured"] as const;

/** Reference pricing per mockup (decision C-D5: confirm against subscription_plans seed). */
export const IBP_PLAN_PRICING: Record<string, number> = {
  standard: 60,
  premium: 150,
  featured: 350,
};
