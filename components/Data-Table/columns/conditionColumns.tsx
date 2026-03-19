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
          row.original.bodyParts.join(", ")
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
          row.original.categories.join(", ")
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

      // Helper to handle actions safely
      const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation(); // This is the magic line
        action();
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Management</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => handleAction(e, () => openView(condition.id))}
              >
                <FileText className="mr-2 h-4 w-4" /> View Full Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => handleAction(e, () => openEdit(condition))}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(condition.id);
                }}
              >
                Copy Condition ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];