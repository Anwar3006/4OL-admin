import { ColumnDef } from "@tanstack/react-table";
import { FileText, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAddHealthyLivingDialog, useViewHealthyLivingDialog } from "@/stores/dialog-store";
import { THealthyLivingOutput } from "@/schemas/healthyLiving.schema";

export const healthyLivingColumns: ColumnDef<THealthyLivingOutput>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold text-slate-900">Name</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3 min-w-40">
          <span className="font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-slate-700">
            {row.original.name}
          </span>
        </div>
      );
    },
  },

  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold text-slate-900 hidden xl:table-cell">Created</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell text-xs text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })}
      </div>
    ),
  },

  {
    id: "actions",
    header: () => <div className="font-semibold text-slate-900">Actions</div>,
    cell: ({ row }) => {
      const { open: openView } = useViewHealthyLivingDialog();
      const { open: openEdit } = useAddHealthyLivingDialog();

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(row.original.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
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
