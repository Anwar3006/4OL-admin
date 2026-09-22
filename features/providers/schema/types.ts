import { facilityProfileSchema } from "@/features/facilities/schema/types";

/**
 * registerProviderAccount()'s request body is the same shape the "Register
 * New Facility" dialog already builds and validates client-side — the two
 * halves (ui/ and api/) share this one definition instead of each keeping
 * their own field list (the mistake rule 4 calls out: BODY_SYSTEMS and
 * FacilityScoutTabProps each drifted because there was nowhere neutral to
 * put the shared shape).
 *
 * providers/ owns this contract now; facilities/ keeps the canonical zod
 * shape until P0-10 renames facility_profile to providers and this schema
 * moves wholesale.
 */
export const registerProviderAccountSchema = facilityProfileSchema;

export type RegisterProviderAccountInput = typeof registerProviderAccountSchema["_input"];

export interface CredentialDeliveryResult {
  channel: "email" | "whatsapp" | "sms";
  status: "sent" | "delivered" | "failed" | "undelivered" | "skipped";
  destinationMasked: string;
  error?: string;
}

export interface RegisterProviderAccountResult {
  userId: string;
  isNewUser: boolean;
  providerId: string;
  deliveries: CredentialDeliveryResult[];
}

/**
 * P0-14 (Providers admin module) shapes below. Shared by
 * ui/ProvidersPage.tsx + ui/ProviderDetailPage.tsx and api/{list,stats,
 * options,detail,status}.ts.
 *
 * providers.kind and providers.status are real Postgres enums
 * (provider_kind, facility_status_enum); providers.verification_status is a
 * checked text column, not an enum (see P0-10). Keep these lists in sync
 * with lib/db/database.types.ts if either ever changes.
 */

export const PROVIDER_KINDS = [
  "care_facility",
  "vendor",
  "practitioner",
  "trainer",
  "ambulance_operator",
] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  care_facility: "Care facility",
  vendor: "Vendor",
  practitioner: "Practitioner",
  trainer: "Fitness trainer",
  ambulance_operator: "Ambulance operator",
};

export const PROVIDER_STATUSES = [
  "pending",
  "active",
  "inactive",
  "suspended",
  "rejected",
  "draft",
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "expired",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface ProviderTypeOption {
  key: string;
  kind: ProviderKind;
  label: string;
  directory_category: string | null;
  is_listed: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ProviderRow {
  id: string;
  name: string;
  kind: ProviderKind;
  provider_type: string;
  provider_type_label: string | null;
  description: string | null;
  region: string;
  district: string;
  area: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  status: ProviderStatus;
  verification_status: VerificationStatus;
  subscription_tier: string | null;
  is_online_only: boolean;
  is_top_rated: boolean | null;
  is_featured: boolean | null;
  view_count: number | null;
  rating_average: number | null;
  rating_count: number | null;
  status_reason: string | null;
  rejection_reason: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string | null;
}

export interface ProvidersListParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: ProviderKind | "all";
  type?: string | "all";
  status?: ProviderStatus | "all";
  verification?: VerificationStatus | "all";
  tier?: string | "all";
  region?: string | "all";
}

export interface ProvidersListResponse {
  data: ProviderRow[];
  meta: { total: number; totalPages: number; currentPage: number };
}

export interface ProviderStatsResponse {
  total: number;
  byStatus: Record<ProviderStatus, number>;
  byKind: Record<ProviderKind, number>;
  byVerification: Record<VerificationStatus, number>;
}

export interface ProviderOptionsResponse {
  kinds: { value: ProviderKind; label: string }[];
  types: ProviderTypeOption[];
  regions: readonly string[];
  statuses: readonly ProviderStatus[];
  verificationStatuses: readonly VerificationStatus[];
}

export interface ProviderDetail extends ProviderRow {
  gps_address: string;
  street: string;
  post_code: string;
  country: string;
  latitude: number;
  longitude: number;
  ownership: string;
  accepts_nhis: boolean | null;
  business_hours: unknown;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_position: string | null;
  admin_notes: string | null;
}

/**
 * Shapes for the eight detail tabs beyond Profile (P0-14). Kept in this one
 * file, not split per-tab — CLAUDE.md rule 4's schema/ slot is for what
 * ui/ and api/ agree on, and these are all small enough that one file
 * beats eight near-empty ones.
 */

export const CREDENTIAL_STATUSES = ["pending", "verified", "rejected", "expired", "revoked"] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export interface ProviderCredentialRow {
  id: string;
  provider_id: string;
  credential_type: string;
  credential_type_label: string | null;
  regulator: string | null;
  number: string;
  document_path: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: CredentialStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ProviderCapabilityRow {
  provider_id: string;
  capability: string;
  capability_label: string | null;
  source: "credential" | "admin_override";
  credential_id: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  override_reason: string | null;
}

export const CATALOGUE_ITEM_STATUSES = ["draft", "pending_review", "published", "rejected", "archived"] as const;
export type CatalogueItemStatus = (typeof CATALOGUE_ITEM_STATUSES)[number];

export interface ProviderCatalogueItemRow {
  id: string;
  provider_id: string;
  item_type: string;
  name: string;
  description: string | null;
  category: string | null;
  capability_required: string | null;
  price: number | null;
  currency: string;
  unit: string | null;
  duration_minutes: number | null;
  stock_status: string;
  status: CatalogueItemStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderReviewRow {
  id: string;
  facility_id: string;
  user_id: string;
  parent_id: string | null;
  rating: number | null;
  comment_text: string;
  is_anonymous: boolean;
  is_verified_visit: boolean | null;
  helpful_count: number | null;
  status: "approved" | "rejected" | "pending";
  created_at: string | null;
  author_name: string | null;
}

export interface ProviderSubscriptionRow {
  id: string;
  facility_id: string;
  subscription_id: string;
  subscription_name: string | null;
  status: string;
  billing_cycle: string;
  auto_renew: boolean;
  started_at: string;
  current_period_end: string | null;
  cancelled_at: string | null;
}

export interface ProviderDeliveryRow {
  id: string;
  channel: string;
  status: string;
  destination_masked: string;
  attempt: number;
  error: string | null;
  created_at: string;
}

export interface ProviderActivityRow {
  id: number;
  action: string;
  actor_kind: "owner" | "admin" | "system";
  actor_id: string | null;
  device_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
}

export interface CredentialTypeOption {
  key: string;
  regulator: string;
  label: string;
  applies_to: ProviderKind[];
  has_expiry: boolean;
  grants: string[];
}

export interface CapabilityOption {
  key: string;
  label: string;
  applies_to: ProviderKind[];
  requires_item_review: boolean;
  description: string | null;
}

export interface ProviderQueuesResponse {
  credentialsToReview: { count: number; items: (ProviderCredentialRow & { provider_name: string })[] };
  catalogueToReview: { count: number; items: (ProviderCatalogueItemRow & { provider_name: string })[] };
  expiringSoon: { count: number; items: (ProviderCredentialRow & { provider_name: string })[] };
  onboardingRequests: { count: number; items: OnboardingRequestRow[] };
}

export interface OnboardingRequestRow {
  id: string;
  business_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  request_type: string;
  status: string;
  created_at: string | null;
}
