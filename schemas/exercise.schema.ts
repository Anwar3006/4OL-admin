import { z } from "zod";

export const CATEGORIES = [
  "Arm",
  "Back",
  "Biceps",
  "Chest",
  "Chest and Triceps",
  "Glutes",
  "Hamstring",
  "Legs",
  "Quadriceps",
  "Rectus Abdominus Muscle",
  "Shoulder",
  "Triceps",
] as const;

export const EQUIPMENT_TYPES = [
  "No Equipment",
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Gym Machine Workout",
  "Resistance Band",
  "Treadmill",
  "Exercise Bike",
  "Yoga/ Exercise Mat",
  "Skipping Ropes",
  "Exercise Balls",
  "Weight Bench",
  "Pull up bar",
] as const;

export const EXERCISE_STATUS = ["draft", "published", "archived"] as const;
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
export const TIER_LEVELS = ["pro", "free"] as const;

export const exerciseSchema = z.object({
  id: z.string().uuid().optional(),
  exercise_name: z.string().min(2, "Exercise name is required"),
  category: z.enum(CATEGORIES, {
    message: "Please select a category",
  }),
  primary_muscle_group: z.enum(CATEGORIES, {
    message: "Please select a primary muscle group",
  }),
  secondary_muscles: z.string().optional().nullable(),
  equipment_required: z.enum(EQUIPMENT_TYPES, {
    message: "Please select required equipment",
  }),
  difficulty_level: z.enum(DIFFICULTY_LEVELS).default("beginner").nullable(),
  default_sets: z.string().optional().nullable(),
  default_reps_duration: z.string().optional().nullable(),
  rest_time_seconds: z.string().optional().nullable(),
  description: z.any().optional().nullable(), // For rich text content
  benefits: z.string().optional().nullable(),
  muscles_worked_raw: z.string().optional().nullable(),
  video_url: z.string().url("Invalid video URL").or(z.literal("")).optional().nullable(),
  thumbnail_url: z.string().url("Invalid thumbnail URL").or(z.literal("")).optional().nullable(),
  tier: z.enum(TIER_LEVELS).default("pro"),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  status: z.enum(EXERCISE_STATUS).default("published"),
  tags: z.array(z.string()).default([]),
});

export type TExerciseInput = z.infer<typeof exerciseSchema>;

export const exerciseSchemaOutput = exerciseSchema.extend({
  id: z.string().uuid(),
  view_count: z.number().default(0),
  completion_count: z.number().default(0),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TExerciseOutput = z.infer<typeof exerciseSchemaOutput>;