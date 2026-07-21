import { z } from "zod";
import {
  SUBSCRIPTION_BILLING_CYCLES,
  SUBSCRIPTION_PERIODS,
} from "./marketing-subscription.schema";

// Subscription status
export const FACILITY_SUBSCRIPTION_STATUS = [
  "active",
  "expired",
  "cancelled",
  "pending_payment",
] as const;

// Input schema for creating facility subscriptions
export const facilitySubscriptionSchema = z.object({
  facility_id: z.string().uuid("Invalid facility ID"),
  subscription_id: z.string().uuid("Invalid subscription ID"),
  status: z.enum(FACILITY_SUBSCRIPTION_STATUS).default("pending_payment"),
  started_at: z.string().optional(),
  current_period_end: z.string().optional().nullable(),
  billing_cycle: z.enum(SUBSCRIPTION_BILLING_CYCLES),
  auto_renew: z.boolean().default(true),
  cancelled_at: z.string().optional().nullable(),
});

export type TFacilitySubscriptionInput = z.infer<
  typeof facilitySubscriptionSchema
>;

// Output schema
export const facilitySubscriptionSchemaOutput =
  facilitySubscriptionSchema.extend({
    id: z.string().uuid(),
    created_at: z.string().or(z.date()),
    updated_at: z.string().or(z.date()),
    facility: z
      .object({
        facility_name: z.string().optional().nullable(),
        owner_email: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    subscription: z
      .object({
        name: z.string().optional().nullable(),
        price: z.number().optional().nullable(),
        privileges: z.array(z.string()).optional().nullable(),
      })
      .optional()
      .nullable(),
  });

export type TFacilitySubscriptionOutput = z.infer<
  typeof facilitySubscriptionSchemaOutput
>;
