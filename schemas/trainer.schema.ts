import z from "zod";

export const TRAINER_STATUS = ["pending", "active", "suspended", "rejected"] as const;

export const trainerSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid("Please select a user"),
  bio: z.string().min(10, "Bio must be at least 10 characters").or(z.literal("")).optional().nullable(),
  certifications: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  years_experience: z.number().int().min(0).default(0),
  is_verified: z.boolean().default(false),
  status: z.enum(TRAINER_STATUS).default("pending"),
  // Allows valid URL or clean empty string without failing validation
  profile_video_url: z.string().url("Invalid video URL").or(z.literal("")).optional().nullable(),
  social_links: z.object({
    instagram: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
  }).default({}),
  availability_schedule: z.any().default({}),
});

export type TTrainerInput = z.infer<typeof trainerSchema>;

export const trainerSchemaOutput = trainerSchema.extend({
  id: z.string().uuid(),
  rating_average: z.number().default(0),
  rating_count: z.number().int().default(0),
  total_sessions: z.number().int().default(0),
  total_clients: z.number().int().default(0),
  verified_by: z.string().uuid().optional().nullable(),
  verified_at: z.string().or(z.date()).optional().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  
  user_profiles: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    avatar_url: z.string().optional().nullable(),
  }).optional(),
});

export type TTrainerOutput = z.infer<typeof trainerSchemaOutput>;