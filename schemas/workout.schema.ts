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
  video_url: z.string().optional().nullable(),
  thumbnail_urls: z.array(z.string()).default([]),
  how_to: z.any().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type TWorkoutInput = z.infer<typeof workoutSchema>;

export const workoutSchemaOutput = workoutSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TWorkoutOutput = z.infer<typeof workoutSchemaOutput>;
