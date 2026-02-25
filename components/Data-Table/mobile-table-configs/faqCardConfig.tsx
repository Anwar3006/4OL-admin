import { TFAQOutput } from "@4ol/db/schemas/faq.schema";
import { MobileCardConfig } from "../mobile-card-types";
import { format, formatDistanceToNow } from "date-fns";

export const faqCardConfig: MobileCardConfig<TFAQOutput> = {
  // Truncate question if it's exceptionally long
  header: {
    title: (faq: TFAQOutput) =>
      faq.question.length > 50
        ? `${faq.question.substring(0, 50)}...`
        : faq.question,

    // Senior Move: Don't show the whole answer. Truncate for scannability.
    subtitle: (faq: TFAQOutput) =>
      faq.answer.length > 80 ? `${faq.answer.substring(0, 80)}...` : faq.answer,
  },
  fields: [
    {
      id: "createdAt",
      label: "Last Updated",
      // Using relative time (e.g., "2 days ago") feels more "mobile-native"
      render: (faq: TFAQOutput) =>
        formatDistanceToNow(new Date(faq.createdAt), { addSuffix: true }),
    },
    {
      id: "readingTime",
      label: "Reading Time",
      // Derived field to help user commitment
      render: (faq: TFAQOutput) => {
        const words = faq.answer.split(" ").length;
        const minutes = Math.ceil(words / 200);
        return `${minutes} min read`;
      },
    },
  ],
};
