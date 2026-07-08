"use client";
import { ColumnDef } from "@tanstack/react-table";
import {
  Mail,
  Phone,
  Edit,
  FileText,
  Trash2,
  User,
  Calendar,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useViewUserDialog } from "@/stores/dialog-store";

export const userColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden border border-slate-200">
          {row.original.avatar_url ? (
            <img
              src={row.original.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.user_id}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 tracking-tight leading-none mb-1">
          <Mail className="w-3 h-3 text-slate-400" />
          {row.original.email}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          <Phone className="w-3 h-3 text-slate-400" />
          {row.original.phone_number || "N/A"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "user_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">
        {row.original.user_type}
      </span>
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
          {format(new Date(row.original.created_at), "MMM dd, yyyy")}
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
      const { open: openView } = useViewUserDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(user.user_id);
            }}
          >
            👁️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Edit handler will be added in page component
            }}
          >
            ✏️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Delete handler will be added in page component
            }}
          >
            🗑️
          </button>
        </div>
      );
    },
  },
];
