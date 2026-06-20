import { z } from "zod";

// Threat level enum for difficulty mapping
export const DIFFICULTY_LEVELS = ["critical", "high", "medium", "low", "info"] as const;

// Moderation status enum
export const MODERATION_STATUS = [
  "pending_review",
  "approved",
  "rejected",
  "flagged",
  "escalated",
  "auto_moderated",
] as const;

// Challenge status enum
export const CHALLENGE_STATUS = ["draft", "upcoming", "active", "completed", "cancelled"] as const;

// -------------------------------------------------------------
// ROUTES SCHEMA
// -------------------------------------------------------------
export const fitnessOutdoorRouteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Route name is required"),
  description: z.string().optional().nullable(),
  category: z.string().min(2, "Category is required"),
  difficulty: z.enum(DIFFICULTY_LEVELS).default("low"),
  surface_type: z.string().optional().nullable(),
  gps_data: z.any().optional().nullable(),
  start_location_name: z.string().optional().nullable(),
  distance_km: z.coerce.number().nonnegative("Distance must be a positive number").optional().nullable(),
  estimated_duration_mins: z.coerce.number().int().nonnegative("Duration must be a positive integer").optional().nullable(),
  verification_status: z.enum(MODERATION_STATUS).default("pending_review"),
  verified_by: z.string().uuid().optional().nullable(),
  image_urls: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional().nullable(),
});

export type TFitnessOutdoorRouteInput = z.infer<typeof fitnessOutdoorRouteSchema>;

export const fitnessOutdoorRouteSchemaOutput = fitnessOutdoorRouteSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  creator: z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
  }).optional().nullable(),
  verifier: z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type TFitnessOutdoorRouteOutput = z.infer<typeof fitnessOutdoorRouteSchemaOutput>;

// -------------------------------------------------------------
// EVENTS SCHEMA
// -------------------------------------------------------------
export const fitnessOutdoorEventSchema = z.object({
  id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  start_at: z.coerce.date({ error: "Start date is required" }),
  max_participants: z.coerce.number().int().positive("Max participants must be positive").optional().nullable(),
  current_participants: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(CHALLENGE_STATUS).default("upcoming"),
  created_by: z.string().uuid().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  area: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export type TFitnessOutdoorEventInput = z.infer<typeof fitnessOutdoorEventSchema>;

export const fitnessOutdoorEventSchemaOutput = fitnessOutdoorEventSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  route: z.object({
    name: z.string(),
  }).optional().nullable(),
  creator: z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type TFitnessOutdoorEventOutput = z.infer<typeof fitnessOutdoorEventSchemaOutput>;

// -------------------------------------------------------------
// REVIEWS SCHEMA
// -------------------------------------------------------------
export const fitnessOutdoorReviewSchema = z.object({
  id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  rating: z.coerce.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().optional().nullable(),
  is_flagged: z.boolean().default(false),
  moderation_status: z.enum(MODERATION_STATUS).default("approved"),
});

export type TFitnessOutdoorReviewInput = z.infer<typeof fitnessOutdoorReviewSchema>;

export const fitnessOutdoorReviewSchemaOutput = fitnessOutdoorReviewSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().or(z.date()),
  route: z.object({
    name: z.string(),
  }).optional().nullable(),
  user: z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type TFitnessOutdoorReviewOutput = z.infer<typeof fitnessOutdoorReviewSchemaOutput>;
