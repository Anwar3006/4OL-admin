"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Phone, Calendar, Activity } from "lucide-react";
import { useViewAdminDialog, useAddAdminDialog } from "@/features/admins/data/dialog-hooks";
import { useMakeGroupLeaderDialog } from "@/features/chat/data/dialog-hooks";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const adminColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Administrator",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-500 border border-indigo-100">
          <span className="text-2xs font-black uppercase">
            {row.original.name?.substring(0, 2)}
          </span>
        </div>
        <div>
          <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
            {row.original.name}
          </div>
          <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "phone_number",
    header: "Contact",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Phone className="h-3 w-3 text-slate-400" />
        <span className="text-xs font-black text-slate-600 dark:text-slate-300 tracking-tight">
          {row.original.phone_number || "N/A"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || "active";
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
            status === "active"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
              : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "activity",
    header: "Activity",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300 tracking-tight leading-none mb-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {row.original.created_at
            ? format(new Date(row.original.created_at), "MMM dd, yyyy")
            : "N/A"}
        </div>
        <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400 uppercase tracking-widest leading-none">
          <Activity className="w-3 h-3 text-slate-400" />
          {row.original.last_active
            ? format(new Date(row.original.last_active), "MMM dd, HH:mm")
            : "Never"}
        </div>
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const user = row.original;
      const { open: openView } = useViewAdminDialog();
      const { open: openMakeLeader } = useMakeGroupLeaderDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="View Details"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(user.user_id);
            }}
          >
            👁️
          </button>
          <button aria-label="Action"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openMakeLeader(user.user_id, user);
            }}
          >
            🏆
          </button>
          <button aria-label="Delete"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            🗑️
          </button>
        </div>
      );
    },
  },
];
