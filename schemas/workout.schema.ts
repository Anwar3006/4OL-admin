import { z } from "zod";

export const BODY_PARTS = [
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

export const WORKOUT_STATUS = ["draft", "published", "archived"] as const;
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

export const workoutSchema = z.object({
  id: z.string().uuid().optional(),
  exercise_name: z.string().min(2, "Exercise name is required"),
  primary_body_part: z.enum(BODY_PARTS, {
    message: "Please select a primary body part",
  }),
  secondary_body_part: z.enum(BODY_PARTS).optional().nullable(),
  equipment_type: z.enum(EQUIPMENT_TYPES, {
    message: "Please select an equipment type",
  }),
  intensity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .nullable(),
  difficulty_level: z.enum(DIFFICULTY_LEVELS).default("beginner"),
  status: z.enum(WORKOUT_STATUS).default("published"),
  duration_minutes: z.number().int().min(1).default(10),
  calories_burned: z.number().int().min(0).default(0),
  video_url: z.string().url("Invalid video URL").optional().nullable(),
  thumbnail_urls: z.array(z.string()).default([]),
  how_to: z.any().optional().nullable(),
  tags: z.array(z.string()).default([]),
  is_premium: z.boolean().default(false),
  is_active: z.boolean().default(true),
  author_id: z.string().uuid().optional().nullable(),
});

export type TWorkoutInput = z.infer<typeof workoutSchema>;

export const workoutSchemaOutput = workoutSchema.extend({
  id: z.string().uuid(),
  view_count: z.number().default(0),
  completion_count: z.number().default(0),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TWorkoutOutput = z.infer<typeof workoutSchemaOutput>;
