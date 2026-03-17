import z from "zod";

export const marketingSubscriptionSchema = z.object({
  name: z.string().min(2, "Subscription name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  billingCycle: z.enum(["monthly", "quarterly", "yearly", "one-time"]),
  features: z.array(z.string()).default([]),
  maxUsers: z.number().optional().nullable(),
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
};
