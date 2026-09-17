import z from "zod";

/**
 * Moved from features/marketing/schema/subscription.ts as part of the
 * subscriptions-page consolidation (four surfaces -> one). Logic unchanged.
 */

export const SUBSCRIPTION_PERIODS = [
  "free",
  "3days",
  "7days",
  "0.5month",
  "1month",
  "3months",
  "6months",
  "12months",
  "Lifetime",
] as const;

export const SUBSCRIPTION_BILLING_CYCLES = [
  "monthly",
  "yearly",
  "one-time",
] as const;

export const SUBSCRIPTION_PRODUCTS = [
  "full_access",
  "plasence",
  "fitness",
] as const;

export const SUBSCRIPTION_PRODUCT_LABELS: Record<
  (typeof SUBSCRIPTION_PRODUCTS)[number],
  string
> = {
  full_access: "Full Access",
  plasence: "Plasence",
  fitness: "Fitness",
};

export const SUBSCRIPTION_PRIVILEGES = [
  "business_analytics",
  "performance_analytics",
  "popup_notification",
  "top_rated_placement",
  "featured_placement",
  "ad_discount_10",
  "ad_discount_25",
  "ad_discount_30",
  "ad_discount_40",
  "ad_discount_50",
  "ad_flyer_discount_10",
  "advanced_analytics",
  "priority_support",
] as const;

// Marketing unification build: consumer plan cards render free-form feature
// lines from subscription_tiers.benefits (e.g. "Telemedicine (5 consults/mo)"),
// so privileges widen from the legacy business enum to any string. The
// legacy enum values stay valid.
export const subscriptionPrivilegeSchema = z.union([
  z.enum(SUBSCRIPTION_PRIVILEGES),
  z.string(),
]);

export const marketingSubscriptionSchema = z.object({
  name: z.string().min(2, "Subscription name is required"),
  description: z.string().optional(),
  tierType: z.enum(SUBSCRIPTION_PRODUCTS),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  period: z.enum(SUBSCRIPTION_PERIODS),
  billingCycle: z.enum(SUBSCRIPTION_BILLING_CYCLES),
  privileges: z.array(subscriptionPrivilegeSchema).default([]),
  tierLimit: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type TMarketingSubscriptionInput = z.infer<
  typeof marketingSubscriptionSchema
>;

export type TMarketingSubscriptionOutput = TMarketingSubscriptionInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  subscribers?: number;
  active_subscribers?: number;
};
