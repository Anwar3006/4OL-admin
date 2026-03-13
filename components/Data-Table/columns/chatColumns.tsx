"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TChatOutput } from "@/schemas/chat.schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const chatColumns: ColumnDef<TChatOutput>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
  },
  {
    accessorKey: "user_name",
    header: "Requested By",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm leading-none">
            {row.original.user_profiles?.first_name}{" "}
            {row.original.user_profiles?.last_name}
          </span>
          {row.original.user_profiles?.phone_number && (
            <span className="text-[10px] text-muted-foreground mt-1 truncate">
              {row.original.user_profiles.phone_number}
            </span>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="truncate max-w-[200px] block text-sm">
        {row.original.subject}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.original.priority;
      return (
        <Badge
          variant={priority === "High" ? "destructive" : "secondary"}
          className={cn(
            "text-[10px] font-bold uppercase",
            priority === "Medium" &&
              "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
            priority === "Low" &&
              "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
          )}
        >
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold uppercase",
            status === "Open"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {format(new Date(row.original.created_at), "dd/MM/yyyy")}
      </span>
    ),
  },
];
