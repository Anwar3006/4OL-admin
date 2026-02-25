import z from "zod";
import { MARKETING_TYPE_ENUM } from "../types/formInput";

export const marketingProfileSchema = z.object({
  marketingType: z.enum(MARKETING_TYPE_ENUM),
  headline: z.string().min(5, "Headline must be at least 5 characters"),
  description: z.string().min(20, "Please provide a detailed description"),
  imageUrl: z.string(),
  organization: z.string().min(2, "Organization name is required"),
  links: z.object().catchall(z.string().optional()),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  cta: z.string().min(1, "Please select a Call to Action"),
});

export type TMarketingProfileInput = z.infer<typeof marketingProfileSchema>;

export type TMarketingProfileOutput = {
  marketingType: "ads" | "events" | "news" | "health" | "other";
  headline: string;
  description: string;
  imageUrl: string;
  organization: string;
  links: any;
  startDate: string;
  endDate: string;
  cta: string;
  id: string;
  status: "draft" | "scheduled" | "live" | "paused" | "ended";
};
