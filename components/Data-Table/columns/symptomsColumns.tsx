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
import { TSymptomsOutput } from "@/types/symptoms";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";

export const symptomsColumns: ColumnDef<TSymptomsOutput>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Symptom Name</div>,
    cell: ({ row }) => {
      const isSystemic = row.original.is_systemic;
      return (
        <div className="flex items-center gap-3 min-w-50">
          {/* <div
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
          </div> */}
          <div className="flex flex-col">
            <span className="font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
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
          <Badge variant="outline" className="text-[12px] py-1 px-2.5 h-auto rounded-md font-medium">
            {row.original.bodyParts.join(", ")}
          </Badge>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "categories",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Categories</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-40">
        {(row.original as any).categories?.length > 0 ? (
          <Badge variant="secondary" className="text-[12px] py-1 px-2.5 h-auto rounded-md font-medium">
            {(row.original as any).categories.join(", ")}
          </Badge>
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
        <Badge variant="secondary" className="font-medium bg-emerald-50 text-emerald-700 border-emerald-100">
          {row.original.specialist || "General"}
        </Badge>
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
          <Button
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
          <Button
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete logic here if available
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
