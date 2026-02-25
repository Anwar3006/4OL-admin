"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useViewHealthyLivingDialog } from "@/stores/dialog-store";
import { THealthyLivingOutput } from "@4ol/db/schemas/healthyLiving.schema";

export const healthyLivingColumns: ColumnDef<THealthyLivingOutput>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Name</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3 min-w-50">
          <Activity className="h-4 w-4" />
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
    accessorKey: "updatedAt",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Last Edited</div>
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
    cell: ({ row }) => {
      const healthyLiving = row.original;
      const { open: openView } = useViewHealthyLivingDialog();

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Management</DropdownMenuLabel>

              <DropdownMenuItem onClick={() => openView(healthyLiving.id)}>
                <FileText className="mr-2 h-4 w-4" /> View Full Details
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(healthyLiving.id)}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
