import z from "zod";
import { FACILITY_TYPE_ENUM, GHANA_REGIONS_ENUM } from "../types/formInput";

export const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm format");

export const businessDaySchema = z.object({
  day: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  open: timeString,
  close: timeString,
  isClosed: z.boolean().default(false), // Useful for holidays or weekends
});
export type BusinessDay = z.infer<typeof businessDaySchema>;

export const facilityProfileSchema = z.object({
  ownerId: z.string().optional(),
  facility_type: z.enum(FACILITY_TYPE_ENUM),
  facility_name: z.string().min(1, "Please enter facility name"),
  contact_number: z.string().min(1, "Please enter facility contact number"),
  whatsapp_number: z.string().optional(),
  email: z.email().optional(),
  media_urls: z.array(z.string()),

  gps_address: z.string().min(1, "Please enter facility gps address"),
  street: z.string().min(1, "Please enter facility street"),
  post_code: z.string().min(1, "Please enter facility post code"),
  area: z.string().min(1, "Please enter facility area"),
  district: z.string().min(1, "Please enter facility district"),
  region: z.enum(GHANA_REGIONS_ENUM).default("greater accra"),
  country: z.string().default("Ghana"),

  // Coordinates are numbers in Zod
  latitude: z.number({ error: "Latitude must be a number" }),
  longitude: z.number({ error: "Longitude must be a number" }),

  ownership: z.string().min(1, "Please select ownership"),
  accepts_nhis: z.boolean().default(false),

  services: z.array(z.string()).min(1, "Please select at least one service"),
  amenities: z.array(z.string()).min(1, "Please select at least one amenity"),

  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  owner_email: z.email("Invalid owner email"),
  person_contact_number: z.string().min(1, "Personal contact is required"),
  position: z.string().optional(),

  // ✅ Structured Business Hours
  business_hours: z.array(businessDaySchema),

  keywords: z.string(),

  // Wellness sub-type (Gym, Spa, etc.) - saved as Wellness(Type)
  wellness_subtype: z.string().optional(),

  // Offerings (Subscriptions, Packages, etc.)
  offerings: z
    .array(
      z.object({
        name: z.string().min(1, "Offering name is required"),
        description: z.string().optional(),
        price: z.preprocess((val) => Number(val), z.number()),
        currency: z.string().default("GHS"),
        offering_type: z.enum([
          "subscription",
          "walk-in",
          "package",
          "onetime_fee",
        ]),
        duration_months: z.preprocess(
          (val) => (val === "" || val === undefined ? null : Number(val)),
          z.number().nullable(),
        ),
        is_active: z.boolean().default(true),
      }),
    )
    .optional(),
});
// .refine((data) => data.mediaUrls.length >= 6, {
//   message: "Please ensure you upload at least 6 images",
//   path: ["mediaUrls"],
// });

export type TFacilityProfileInput = z.infer<typeof facilityProfileSchema>;

const facilitySchema = facilityProfileSchema.extend({
  id: z.string(),
  created_at: z.string() || z.date(),
  media_urls: z.array(z.string()),
  amenities: z.array(z.string()),
  services: z.array(z.string()),
  business_hours: z.array(businessDaySchema),
  approved_at: z.string() || z.date(),
  featured_image_url: z.string(),
  avg_rating: z.number(),
  keywords: z.array(z.string()),
  location: z.any(),
  status: z.string(),
});
export type TFacilityProfileOutput = z.infer<typeof facilitySchema>;
