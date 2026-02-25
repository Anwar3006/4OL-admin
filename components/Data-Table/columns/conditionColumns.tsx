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
import { TConditionsOutput } from "@4ol/db/schemas/conditions.schema";
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
          <div
            className={`p-2 rounded-lg ${
              isSystemic
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {isSystemic ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">
              {row.original.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">
              {row.original.slug}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "specialist",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Specialist</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-37.5">
        <Badge variant="secondary" className="font-medium">
          {row.original.specialist || "General"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "nhsLink",
    header: () => (
      <div className="font-semibold hidden lg:table-cell text-center">
        Reference
      </div>
    ),
    cell: ({ row }) => {
      const link = row.original.nhs_link;
      return (
        <div className="hidden lg:flex justify-center min-w-25">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 hover:text-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </div>
      );
    },
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

      // const conditionToEdit = {

      //             ...condition,
      //             // Rehydrate the visual selection for the tree components
      //             bodyParts: rehydrateHierarchy(condition.bodyParts, bodyParts),
      //             categories: rehydrateHierarchy(condition.categories, categories),
      //             types: condition.types,
      //             causes: condition.causes,
      //             nhs_link: condition.nhs_link ?? "",
      //             image_url: condition.image_url ?? "",

      // }

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
