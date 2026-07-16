import { ColumnDef } from "@tanstack/react-table";
import { FileText, Edit, Trash2, Eye, CalendarDays } from "lucide-react";
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
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 min-w-[200px]">
        <span className="font-bold text-sm text-slate-800">
          {row.original.name || "Untitled"}
        </span>
        {row.original.slug && (
          <span className="text-xs text-muted-foreground font-mono">
            /{row.original.slug}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: () => (
      <div className="font-semibold text-slate-900">Description</div>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-slate-500 line-clamp-2 max-w-[240px]">
        {row.original.description || "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold text-slate-900">Status</div>,
    cell: ({ row }) => {
      const status = row.original.status || "draft";
      const statusColors: Record<string, string> = {
        published: "bg-emerald-50 text-emerald-700 border-emerald-200",
        draft: "bg-slate-100 text-slate-700 border-slate-200",
        archived: "bg-rose-50 text-rose-700 border-rose-200",
      };

      return (
        <Badge
          className={`capitalize border shadow-none text-[10px] font-bold tracking-wider ${
            statusColors[status] || statusColors.draft
          }`}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "view_count",
    header: () => (
      <div className="font-semibold text-slate-900 text-center">Views</div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
        <Eye className="h-3.5 w-3.5 text-slate-400" />
        {row.original.view_count ?? 0}
      </div>
    ),
  },
  {
    accessorKey: "updated_at",
    header: () => (
      <div className="font-semibold text-slate-900 hidden lg:table-cell">
        Updated
      </div>
    ),
    cell: ({ row }) => {
      if (!row.original.updated_at)
        return (
          <div className="hidden lg:table-cell text-xs text-muted-foreground">
            -
          </div>
        );
      return (
        <div className="hidden lg:table-cell flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {new Date(row.original.updated_at).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold text-slate-900 hidden lg:table-cell">
        Created
      </div>
    ),
    cell: ({ row }) => {
      if (!row.original.created_at)
        return (
          <div className="hidden lg:table-cell text-xs text-muted-foreground">
            -
          </div>
        );
      return (
        <div className="hidden lg:table-cell text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-slate-900">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
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
          👁️
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
          ✏️
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
          🗑️
        </Button>
      </div>
    ),
  },
];
