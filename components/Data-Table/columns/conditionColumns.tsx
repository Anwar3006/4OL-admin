"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ExternalLink,
  Activity,
  Globe,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TConditionsOutput } from "@/schemas/conditions.schema";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { rehydrateHierarchy } from "@/lib/utils";

export const conditionColumns: ColumnDef<TConditionsOutput>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Condition Name</div>,
    cell: ({ row }) => {
      const isSystemic = row.original.is_systemic;
      return (
        <div className="flex items-center gap-3 min-w-50">
          <div className="flex flex-col">
            <span className="font-bold text-sm text-green-600">
              {row.original.name}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "bodyParts",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Bodypart/s</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-40">
        {row.original.bodyParts?.length > 0 ? (
          row.original.bodyParts.length > 2 ?  `${row.original.bodyParts.slice(0, 2).join(", ")} + ${row.original.bodyParts.length - 2} more`: row.original.bodyParts.join(", ")
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>
    )
  },
  {
    accessorKey: "categories",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Categories</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-40">
        {row.original.categories?.length > 0 ? (
          row.original.categories.length > 2 ?  `${row.original.categories.slice(0, 2).join(", ")} + ${row.original.categories.length - 2} more`: row.original.categories.join(", ")
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "specialist",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Specialist</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-37.5">
        {row.original.specialist || "General"}
      </div>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Last Edited</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell text-xs text-muted-foreground">
        {new Date(row.original.updated_at).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const condition = row.original;
      const { open: openView } = useViewConditionDialog();
      const { open: openEdit } = useAddConditionDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button aria-label="View Details"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(condition.id);
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
              openEdit(condition);
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