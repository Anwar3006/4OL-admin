import { z } from "zod";

/**
 * Facility Reviews Schema
 * Defines the structure of facility review data from the database
 */

export const facilityReviewSchema = z.object({
  id: z.string(),
  facility_id: z.string(),
  user_id: z.string(),
  parent_id: z.string().nullable().optional(),
  is_published: z.boolean().default(true),
  is_verified_visit: z.boolean().default(false),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment_text: z.string(),
  helpful_count: z.number().int().nonnegative().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Extended schema with related data (for display)
export const facilityReviewWithDataSchema = facilityReviewSchema.extend({
  // Relations can be added here when fetching with joins
  facility_profile: z
    .object({
      id: z.string(),
      facility_name: z.string(),
    })
    .optional(),
  user_profiles: z
    .object({
      user_id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

export type TFacilityReview = z.infer<typeof facilityReviewSchema>;
export type TFacilityReviewWithData = z.infer<
  typeof facilityReviewWithDataSchema
>;
