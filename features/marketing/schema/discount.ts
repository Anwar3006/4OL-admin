import z from "zod";

export const DISCOUNT_TYPE_OPTIONS = [
  "percentage",
  "fixed",
  "bogo",
  "free_trial",
  "partner",
] as const;

export const ELIGIBLE_USER_OPTIONS = [
  "all",
  "new",
  "nhis_linked",
  "free_plan",
] as const;

export const marketingDiscountSchema = z.object({
  name: z.string().min(2, "Discount name is required"),
  description: z.string().optional(),
  discountValue: z.coerce.number().positive("Discount value must be greater than 0"),
  discountType: z.enum(DISCOUNT_TYPE_OPTIONS),
  code: z.string().min(2, "Discount code is required").toUpperCase(),
  maxUses: z.coerce.number().optional().nullable(),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  appliesTo: z.enum(["all", "subscriptions", "specific"]).default("all"),
  applicableItems: z.array(z.string()).default([]),
  // Mockup m-create-discount segmentation fields (0821 marketing extension).
  eligiblePlans: z.array(z.string()).default([]),
  eligibleUsers: z.enum(ELIGIBLE_USER_OPTIONS).default("all"),
  perUserLimit: z.coerce.number().int().positive().optional().nullable(),
  campaignId: z.string().optional().nullable(),
});

export type TMarketingDiscountInput = z.infer<typeof marketingDiscountSchema>;

export type TMarketingDiscountOutput = TMarketingDiscountInput & {
  id: string;
  currentUses: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

/** Runtime row shape returned by /api/marketing/discounts (snake_case). */
export type TDiscountRow = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  discount_type: "percentage" | "fixed" | "bogo" | "free_trial" | "partner";
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applies_to: "all" | "subscriptions" | "specific";
  applicable_items: unknown[];
  eligible_plans?: string[];
  eligible_users?: "all" | "new" | "nhis_linked" | "free_plan";
  per_user_limit?: number | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  status?: "active" | "expired" | "scheduled" | "paused";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
