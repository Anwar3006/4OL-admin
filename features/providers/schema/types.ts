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
