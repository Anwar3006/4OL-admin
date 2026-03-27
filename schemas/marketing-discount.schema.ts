import z from "zod";

export const marketingDiscountSchema = z.object({
  name: z.string().min(2, "Discount name is required"),
  description: z.string().optional(),
  discountValue: z.coerce.number().positive("Discount value must be greater than 0"),
  discountType: z.enum(["percentage", "fixed", "bogo"]),
  code: z.string().min(2, "Discount code is required").toUpperCase(),
  maxUses: z.coerce.number().optional().nullable(),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  appliesTo: z.enum(["all", "subscriptions", "specific"]).default("all"),
  applicableItems: z.array(z.string()).default([]),
});

export type TMarketingDiscountInput = z.infer<typeof marketingDiscountSchema>;

export type TMarketingDiscountOutput = TMarketingDiscountInput & {
  id: string;
  currentUses: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};
