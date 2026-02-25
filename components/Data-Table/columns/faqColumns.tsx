import { ColumnDef } from "@tanstack/react-table";
import { TFAQOutput } from "@4ol/db/schemas/faq.schema";
import { format } from "date-fns";

export const faqColumns: ColumnDef<TFAQOutput>[] = [
  {
    accessorKey: "question",
    header: "Question",
    cell: ({ row }) => {
      const question = row.getValue("question") as string;
      return <div className="max-w-md truncate font-medium">{question}</div>;
    },
  },
  {
    accessorKey: "answer",
    header: "Answer",
    cell: ({ row }) => {
      const answer = row.getValue("answer") as string;
      return (
        <div className="max-w-md truncate text-sm text-muted-foreground">
          {answer}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return <div className="text-sm">{format(date, "yyyy-MM-dd")}</div>;
    },
  },
];
