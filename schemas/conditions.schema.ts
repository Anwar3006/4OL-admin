import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { conditions } from "../models/conditions.model";
import { SerializedEditorState } from "lexical";

// Helper for Lexical Rich Text fields
const richTextSchema = z.any(); // Validates the JSONB structure from Lexical

export const conditionsSchema = z.object({
  name: z.string().min(3, "Please enter a name for the condition"),
  slug: z.string().optional(),
  specialist_to_contact: z.string().optional(),
  nhs_link: z.string(),
  image_url: z.string(),
  is_systemic: z.boolean().default(false),

  // 2. Rich Text Fields (JSONB)
  about: richTextSchema,
  diagnosis: richTextSchema,
  treatment: richTextSchema,
  complications: richTextSchema,
  symptoms: richTextSchema,
  prevention: richTextSchema,
  contact_your_doctor: richTextSchema,
  more_information: richTextSchema,
  attribution: richTextSchema,

  // 3. Relational Links (Many-to-Many)
  // We expect an array of IDs from the Multi-Select UI
  categories: z.array(z.string()).min(1, "Select at least one category"),
  bodyParts: z.array(z.string()).min(1, "Select at least one body part"),

  // 4. Nested Entities (One-to-Many)
  types: z
    .array(
      z.object({
        type_name: z.string().min(1, "Type name is required"),
        about_type: richTextSchema,
      }),
    )
    .default([]),

  causes: z
    .array(
      z.object({
        cause_name: z.string().min(1, "Cause name is required"),
        other_possible_causes: richTextSchema,
      }),
    )
    .default([]),
});

export type TConditionsInput = z.infer<typeof conditionsSchema>;

export const symptomsSchema = conditionsSchema.omit({ symptoms: true });
export type TSymptomsInput = z.infer<typeof symptomsSchema>;

export type TConditionsOutput = {
  id: string;
  name: string;
  slug: string;
  nhs_link: string | null;
  image_url: string | null;

  // 3. Relational Links (Many-to-Many)
  categories: string[];
  bodyParts: string[];

  // 4. Nested Entities (One-to-Many)
  types: {
    type_name: string;
    about_type: SerializedEditorState;
  }[];
  causes: {
    cause_name: string;
    other_possible_causes: SerializedEditorState;
  }[];
  // Map these to the actual Lexical type
  about: SerializedEditorState;
  diagnosis: SerializedEditorState;
  treatment: SerializedEditorState;
  complications: SerializedEditorState;
  symptoms: SerializedEditorState;
  prevention: SerializedEditorState;
  contact_your_doctor: SerializedEditorState;
  more_information: SerializedEditorState;
  attribution: SerializedEditorState;
  is_systemic: boolean;
  specialist: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type TSymptomsOutput = {
  id: string;
  name: string;
  slug: string;
  nhsLink: string | null;
  imageUrl: string | null;
  about: SerializedEditorState;
  diagnosis: SerializedEditorState;
  treatment: SerializedEditorState;
  complications: SerializedEditorState;
  prevention: SerializedEditorState;
  contactYourDoctor: SerializedEditorState;
  moreInformation: SerializedEditorState;
  attribution: SerializedEditorState;
  isSystemic: boolean;
  specialist: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
