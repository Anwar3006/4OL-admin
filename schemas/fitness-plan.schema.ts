import z from "zod";

export const fitnessPlanSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description is required"),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("beginner"),
  duration_weeks: z.number().int().min(1).default(4),
  exercises_per_week: z.number().int().min(1).max(7).default(3),
  target_body_parts: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  is_premium: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  author_id: z.string().uuid().optional().nullable(),
  author_type: z.enum(["trainer", "admin", "ai"]).default("trainer"),
  tags: z.array(z.string()).default([]),
});

export type TFitnessPlanInput = z.infer<typeof fitnessPlanSchema>;

export const fitnessPlanSchemaOutput = fitnessPlanSchema.extend({
  id: z.string().uuid(),
  total_completions: z.number().int().default(0),
  average_rating: z.number().default(0),
  rating_count: z.number().int().default(0),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TFitnessPlanOutput = z.infer<typeof fitnessPlanSchemaOutput>;
