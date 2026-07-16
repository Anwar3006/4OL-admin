import z from "zod";

const richTextSchema = z.any();

export const healthyLivingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  content: richTextSchema.optional(),
  image_url: z.string().optional().nullable(),
  attribution: richTextSchema.optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export type THealthyLivingInput = z.infer<typeof healthyLivingSchema>;

export const healthyLivingOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  attribution: z.record(z.any(), z.any()),
  status: z.enum(["draft", "published", "archived"]),
  view_count: z.number().default(0),
  content: z.record(z.any(), z.any()),
  metadata: z.record(z.any(), z.any()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export type THealthyLivingOutput = z.infer<typeof healthyLivingOutputSchema>;
