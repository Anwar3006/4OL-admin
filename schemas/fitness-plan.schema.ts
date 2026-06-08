import { z } from "zod";

export const PLAN_STATUS = ["draft", "published", "archived"] as const;
export const PLAN_DIFFICULTY = ["beginner", "intermediate", "advanced", "expert"] as const;
export const AUTHOR_TYPES = ["trainer", "admin", "ai"] as const;

export const fitnessPlanSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional().nullable(),
  difficulty_level: z.enum(PLAN_DIFFICULTY, {
    message: "Please select a valid difficulty level",
  }),
  duration_weeks: z.number().int().min(1, "Must be at least 1 week"),
  workouts_per_week: z.number().int().min(1, "Must have at least 1 workout per week"),
  target_body_parts: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  is_premium: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  status: z.enum(PLAN_STATUS).default("published"),
  author_id: z.string().uuid().optional().nullable(),
  author_type: z.enum(AUTHOR_TYPES).default("admin"),
  tags: z.array(z.string()).default([]),
});

export type TFitnessPlanInput = z.infer<typeof fitnessPlanSchema>;

export const fitnessPlanSchemaOutput = fitnessPlanSchema.extend({
  id: z.string().uuid(),
  total_completions: z.number().default(0),
  average_rating: z.number().default(0),
  rating_count: z.number().default(0),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TFitnessPlanOutput = z.infer<typeof fitnessPlanSchemaOutput>;