import { z } from "zod";

// Matched strictly with DB allowed statuses
export const CHALLENGE_STATUS = [
  "draft",
  "upcoming",
  "completed",
  "cancelled",
  "active",
] as const;

export const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  challenge_type: z.string().min(1, "Challenge type is required"),
  // Accept string from input type="date", parse or coerce into Date for local/api processing
  start_date: z.coerce.date({ error: "Start date is required" }),
  end_date: z.coerce.date({ error: "End date is required" }),
  goal_metric: z.string().optional().nullable(),
  goal_value: z.number().nonnegative().optional().nullable(),
  reward_description: z.string().optional().nullable(),
  reward_image_url: z.string().or(z.literal("")).optional().nullable(),
  status: z.enum(CHALLENGE_STATUS).default("draft"),
  is_public: z.boolean().default(true),
  max_participants: z.number().int().positive().optional().nullable(),
  featured_image_url: z.string().or(z.literal("")).optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type TChallengeInput = z.infer<typeof challengeSchema>;

export const challengeSchemaOutput = challengeSchema.extend({
  id: z.string().uuid(),
  current_participants: z.number().int().default(0),
  completion_count: z.number().int().default(0),
  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TChallengeOutput = z.infer<typeof challengeSchemaOutput>;
