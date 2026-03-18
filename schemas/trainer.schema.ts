import z from "zod";

export const trainerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Please enter a name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("Please enter a valid email"),
  specialization: z.string().min(3, "Please enter specialization"),
  services: z.array(z.string()).min(1, "Please select at least one service"),
  image_url: z.string().optional().nullable(),
  status: z.enum(["active", "pending", "inactive"]).default("pending"),
});

export type TTrainerInput = z.infer<typeof trainerSchema>;

export const trainerSchemaOutput = trainerSchema.extend({
  id: z.string(),
  created_at: z.string().or(z.date()),
  last_activity: z.string().or(z.date()).optional().nullable(),
});

export type TTrainerOutput = z.infer<typeof trainerSchemaOutput>;
