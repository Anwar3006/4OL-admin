import z from "zod";

export const faqInputSchema = z.object({
  question: z.string().min(3, "Please enter a question"),
  answer: z.string().min(3, "Please enter an answer"),
  category_id: z.string(),
});

export type TFAQInput = z.infer<typeof faqInputSchema>;

const faqOutputSchema = faqInputSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});
export type TFAQOutput = z.infer<typeof faqOutputSchema>;
