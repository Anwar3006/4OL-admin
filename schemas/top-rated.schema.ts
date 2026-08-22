import { z } from "zod";

// Module types for top_rated_items
export const TOP_RATED_MODULES = [
  "facility",
  "outdoor_route",
  "outdoor_event",
  "challenge",
  "exercise",
  "fitness_plan",
] as const;

// Source types
export const TOP_RATED_SOURCES = ["manual", "subscription"] as const;

// Input schema for creating/updating top_rated_items
export const topRatedItemSchema = z.object({
  module: z.enum(TOP_RATED_MODULES, {
    message: "Please select a valid module",
  }),
  item_id: z.string().uuid("Invalid item ID"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  rating: z.number().nonnegative().optional().nullable(),
  rating_count: z.number().int().nonnegative().optional().nullable(),
  source: z.enum(TOP_RATED_SOURCES).default("manual"),
  rank: z.number().int().optional().nullable(),
  added_by: z.string().uuid().optional().nullable(),
  // Gap Analysis T-D2 — placement windows (lazy expiry, no cron).
  publish_from: z.string().optional().nullable(),
  expire_at: z.string().optional().nullable(),
});

export type TTopRatedItemInput = z.infer<typeof topRatedItemSchema>;

// Output schema (includes generated fields)
export const topRatedItemSchemaOutput = topRatedItemSchema.extend({
  id: z.string().uuid(),
  added_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type TTopRatedItemOutput = z.infer<typeof topRatedItemSchemaOutput>;
