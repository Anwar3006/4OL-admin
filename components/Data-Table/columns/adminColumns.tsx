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
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
          <span className="text-[10px] font-black uppercase">
            {row.original.name?.substring(0, 2)}
          </span>
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
        <span className="text-[11px] font-black text-slate-600 tracking-tight">
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
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            status === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100",
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
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 tracking-tight leading-none mb-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {row.original.created_at
            ? format(new Date(row.original.created_at), "MMM dd, yyyy")
            : "N/A"}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
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
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(user.user_id);
            }}
          >
            👁️
          </button>
          <button aria-label="Action"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openMakeLeader(user.user_id, user);
            }}
          >
            🏆
          </button>
          <button aria-label="Delete"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
