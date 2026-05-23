import z from "zod";

export const CHALLENGE_STATUS = ["draft", "upcoming", "active", "completed", "cancelled"] as const;

export const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description is required"),
  challenge_type: z.string().min(1, "Challenge type is required"),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  goal_metric: z.string().min(1, "Goal metric is required"),
  goal_value: z.number().positive(),
  reward_description: z.string().optional().nullable(),
  reward_image_url: z.string().optional().nullable(),
  status: z.enum(CHALLENGE_STATUS).default("draft"),
  is_public: z.boolean().default(true),
  max_participants: z.number().int().positive().optional().nullable(),
  featured_image_url: z.string().optional().nullable(),
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
