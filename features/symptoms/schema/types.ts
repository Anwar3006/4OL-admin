import z from "zod";

// Simplified types for the old webapp
export type SerializedEditorState = any;

export const symptomSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  slug: z.string().optional(),
  specialist_to_contact: z.string().optional(),
  nhs_link: z.string().optional().or(z.literal("")),
  image_url: z.string().optional().or(z.literal("")),
  is_systemic: z.boolean().default(false),
  about: z.any(),
  diagnosis: z.any(),
  treatment: z.any(),
  complications: z.any(),
  symptoms: z.any(),
  prevention: z.any(),
  contact_your_doctor: z.any(),
  more_information: z.any(),
  attribution: z.any(),
  categories: z.array(z.string()).default([]).optional(),
  bodyParts: z.array(z.string()).default([]).optional(),
  types: z.array(z.any()).default([]),
  causes: z.array(z.any()).default([]),
});

export const symptomsSchema = symptomSchema;
export type TSymptomsInput = z.infer<typeof symptomSchema>;
export type TSymptomsOutput = any;
