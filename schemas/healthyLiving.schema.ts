import z from "zod";

const richTextSchema = z.any();

export const healthyLivingSchema = z.object({
  name: z.string().min(3, "Please enter a name"),
  about: richTextSchema,
  types: z.array(
    z.object({
      type_name: z.string(),
      about_type: richTextSchema,
    }),
  ),
  category: richTextSchema,
  contact_your_doctor: richTextSchema,
  more_information: richTextSchema,
  attribution: richTextSchema,
  image_url: z.string(),
});

export type THealthyLivingInput = z.infer<typeof healthyLivingSchema>;

const healthyLivingSchemaOutput = healthyLivingSchema.extend({
  id: z.string(),
  created_at: z.date(),
  slug: z.string(),
});
export type THealthyLivingOutput = z.infer<typeof healthyLivingSchemaOutput>;
