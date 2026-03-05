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
    accessorKey: "bodyParts",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Bodypart/s</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-40 flex-wrap gap-1">
        {(row.original as any).bodyParts?.length > 0 ? (
          (row.original as any).bodyParts.map((part: string) => (
            <Badge key={part} variant="outline" className="text-[10px] py-0 px-1.5 h-5">
              {part}
            </Badge>
          ))
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
      <div className="hidden lg:table-cell min-w-40 flex-wrap gap-1">
        {(row.original as any).categories?.length > 0 ? (
          (row.original as any).categories.map((cat: string) => (
            <Badge key={cat} variant="secondary" className="text-[10px] py-0 px-1.5 h-5">
              {cat}
            </Badge>
          ))
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
      const { open: openEdit, data } = useAddConditionDialog();

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Management</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openView(condition.id);
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> View Full Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openEdit(condition);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(condition.id)}
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
