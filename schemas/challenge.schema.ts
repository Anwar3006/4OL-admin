import z from "zod";

export const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Please enter a name"),
  period: z.string().min(1, "Please enter a period (e.g., 30 Days)"),
  type: z.string().min(1, "Please enter a type (e.g., Weight Lifting)"),
  status: z.boolean().default(true),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export type TChallengeInput = z.infer<typeof challengeSchema>;

export const challengeSchemaOutput = challengeSchema.extend({
  id: z.string(),
  created_at: z.string().or(z.date()),
  member_count: z.number().default(0),
  members: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar_url: z.string().optional().nullable(),
  })).optional().default([]),
});

export type TChallengeOutput = z.infer<typeof challengeSchemaOutput>;
