import { z } from "zod";

// Kept in sync with the live distribution of fitness_exercises.primary_muscle_group
// (confirmed 2026-09-08) — the previous list ("Arm", "Hamstring", "Quadriceps",
// "Rectus Abdominus Muscle", "Shoulder", ...) didn't match a single real row,
// so this dropdown could never select what most existing exercises actually
// have, and "Shoulders"/"Forearms"/"Flexibility"/"Full Body"/"Cardiovascular"
// (which real rows do use) weren't offered at all.
export const CATEGORIES = [
  "Back",
  "Glutes",
  "Chest",
  "Core",
  "Legs",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Hips",
  "Flexibility",
  "Full Body",
  "Cardiovascular",
] as const;

export const EXERCISE_TYPES = ["cardio", "strength", "stretching"] as const;

// Kept in sync with the live distribution of fitness_exercises.equipment_required
// (confirmed 2026-09-08) — the previous list ("Gym Machine Workout", "Treadmill",
// "Exercise Bike", "Yoga/ Exercise Mat", "Skipping Ropes", "Exercise Balls",
// "Weight Bench", "Pull up bar") matched zero real rows between them, while
// real equipment types like "Bodyweight" (the single largest group, 1000+
// rows), "TRX/Suspension Trainer", and "Cable Machine" weren't selectable.
export const EQUIPMENT_TYPES = [
  "Bodyweight",
  "Dumbbell",
  "TRX/Suspension Trainer",
  "Barbell",
  "Resistance Band",
  "Cable Machine",
  "Box/Jump Box",
  "Kettlebell",
  "Smith Machine",
  "Pull-up Bar",
  "Foam Roller",
  "Yoga Mat",
  "Stability Ball",
  "Medicine Ball",
  "Battle Ropes",
  "Sled/Prowler",
  "Ab Wheel",
  "Rowing Machine",
  "No Equipment",
] as const;

export const EXERCISE_STATUS = ["draft", "published", "archived"] as const;
export const DIFFICULTY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export const TIER_LEVELS = ["pro", "free"] as const;

export const exerciseSchema = z.object({
  id: z.string().uuid().optional(),
  exercise_name: z.string().min(2, "Exercise name is required"),
  category: z.enum(EXERCISE_TYPES, {
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
  video_url: z.string("Invalid video URL"),
  thumbnail_url: z.string("Invalid thumbnail URL"),
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
