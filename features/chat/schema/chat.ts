import { z } from "zod";

export const chatSchema = z.object({
  id: z.number(),
  requested_by: z.string().uuid().nullable(),
  user_name: z.string().nullable(),
  contact_email: z.string().email().nullable().optional(),
  source: z.enum(["app", "web", "office"]).default("app"),
  subject: z.string().nullable(),
  message: z.string().nullable(),
  priority: z.enum(["Low", "Medium", "High"]).default("Low"),
  status: z.enum(["Open", "Unread", "Pending", "Resolved", "Escalated"]).default("Open"),
  is_deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
  assigned_to: z.string().uuid().nullable().optional(),
  assigned_at: z.string().nullable().optional(),
  first_response_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  response_time_minutes: z.number().nullable().optional(),
  satisfaction_rating: z.number().nullable().optional(),
  escalated_at: z.string().nullable().optional(),
  escalated_to: z.string().uuid().nullable().optional(),
  resolution_notes: z.string().nullable().optional(),
  resolved_by: z.string().uuid().nullable().optional(),
  user_profiles: z
    .object({
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
      // avatar_url: z.string().nullable(),
      phone_number: z.string().nullable(),
      // region: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export type TChatOutput = z.infer<typeof chatSchema>;

export const chatInputSchema = chatSchema.pick({
  priority: true,
  status: true,
});

export type TChatInput = z.infer<typeof chatInputSchema>;
