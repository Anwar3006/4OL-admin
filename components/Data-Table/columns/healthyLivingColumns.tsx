import { ColumnDef } from "@tanstack/react-table";
import { FileText, Edit, Trash2, CheckCircle2, Circle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


import { THealthyLivingOutput } from "@/schemas/healthyLiving.schema";

interface HealthyLivingActionHandlers {
  onView: (id: string) => void;
  onEdit: (data: THealthyLivingOutput) => void;
  onDelete: (id: string) => void;
}

export const createHealthyLivingColumns = ({
  onView,
  onEdit,
  onDelete,
}: HealthyLivingActionHandlers): ColumnDef<THealthyLivingOutput>[] => [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold text-slate-900">Name</div>,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <span className="font-bold text-sm text-slate-800">
            {row?.original?.name || "Untitled"}
          </span>
          {row?.original?.slug && (
            <span className="text-xs text-muted-foreground font-mono">
              /{row?.original?.slug}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "content_type",
    header: () => <div className="font-semibold text-slate-900">Type</div>,
    cell: ({ row }) => {
      const type = row?.original?.content_type || "article";
      return (
        <Badge variant="outline" className="capitalize">
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold text-slate-900">Status</div>,
    cell: ({ row }) => {
      const status = row?.original?.status || "draft";
      const statusColors: Record<string, string> = {
        published: "bg-emerald-50 text-emerald-700 border-emerald-200",
        draft: "bg-slate-100 text-slate-700 border-slate-200",
        pending_review: "bg-amber-50 text-amber-700 border-amber-200",
        archived: "bg-rose-50 text-rose-700 border-rose-200",
      };

      return (
        <Badge className={`capitalize border shadow-none ${statusColors[status] || statusColors.draft}`}>
          {status.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "display_order",
    header: () => <div className="font-semibold text-slate-900 text-center">Order</div>,
    cell: ({ row }) => (
      <div className="text-center font-medium text-slate-600 text-sm">
        {row?.original?.display_order ?? 0}
      </div>
    ),
  },
  {
    accessorKey: "is_featured",
    header: () => <div className="font-semibold text-slate-900 text-center">Featured</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row?.original?.is_featured ? (
          <CheckCircle2 className="h-5 w-5 text-amber-500 fill-amber-50" />
        ) : (
          <Circle className="h-5 w-5 text-slate-300" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "view_count",
    header: () => <div className="font-semibold text-slate-900 text-center">Views</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
        <Eye className="h-3.5 w-3.5 text-slate-400" />
        {row?.original?.view_count ?? 0}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold text-slate-900 hidden lg:table-cell">Created</div>
    ),
    cell: ({ row }) => {
      if (!row?.original?.created_at) return <div className="hidden lg:table-cell text-xs text-muted-foreground">-</div>;
      return (
        <div className="hidden lg:table-cell text-xs text-muted-foreground">
          {new Date(row?.original?.created_at).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-slate-900">Actions</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              onView(row.original.id);
            }}
            title="View Content"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            title="Edit Content"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.original.id);
            }}
            title="Delete Content"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];