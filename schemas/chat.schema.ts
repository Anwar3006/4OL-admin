import { z } from "zod";

export const chatSchema = z.object({
  id: z.number(),
  requested_by: z.string().uuid(),
  user_name: z.string().nullable(),
  subject: z.string().nullable(),
  message: z.string().nullable(),
  priority: z.enum(["Low", "Medium", "High"]).default("Low"),
  status: z.enum(["Open", "Closed"]).default("Open"),
  is_deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
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
