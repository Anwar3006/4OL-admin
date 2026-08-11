import { ColumnDef } from "@tanstack/react-table";
import { TFAQOutput } from "@/schemas/faq.schema";
import { format } from "date-fns";
import { Edit, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddFAQDialog, useViewFAQDialog } from "@/stores/dialog-store";

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
  {
    id: "actions",
    header: () => <div className="sr-only">Actions</div>,
    cell: ({ row }) => {
      const faq = row.original;
      const { open: openView } = useViewFAQDialog();
      const { open: openEdit } = useAddFAQDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button aria-label="View Details"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(faq.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button aria-label="Edit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(faq);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button aria-label="Delete"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
