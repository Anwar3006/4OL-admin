import z from "zod";

const richTextSchema = z.any();

export const healthyLivingSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Please enter a name"),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    content_sections: z
      .array(
        z.object({
          sub_name: z.string().min(1, "Section name is required"),
          sub_content: richTextSchema,
        })
      )
      .optional()
      .default([]),
    parent_id: z.string().uuid().optional().nullable(),
    image_url: z.string().optional().nullable(),
    attribution: richTextSchema.optional().nullable(),
  })
);

export type THealthyLivingInput = z.infer<typeof healthyLivingSchema>;

export const healthyLivingSchemaOutput: z.ZodType<any> = z.object({
  id: z.string(),
  created_at: z.string().or(z.date()),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  content_sections: z
    .array(
      z.object({
        sub_name: z.string(),
        sub_content: z.any(),
      })
    )
    .optional()
    .default([]),
  parent_id: z.string().uuid().optional().nullable(),
  image_url: z.string().optional().nullable(),
  attribution: richTextSchema.optional().nullable(),
  children: z.array(z.lazy(() => healthyLivingSchemaOutput)).optional(),
  parent_path: z.string().nullable().optional(), // computed by the healthy_living_info VIEW
});

export type THealthyLivingOutput = z.infer<typeof healthyLivingSchemaOutput>;
