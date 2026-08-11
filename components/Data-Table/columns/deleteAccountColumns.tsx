"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, XCircle, Clock, Eye, Trash2, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const deleteAccountColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user",
    header: "User Request",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
          <User className="h-4 w-4" />
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.first_name} {row.original.last_name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-tight leading-tight truncate">
          {row.original.reason || "Privacy Concerns"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || 'pending';
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
          status === 'approved'
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : status === 'pending'
            ? "bg-amber-50 text-amber-700 border-amber-100"
            : "bg-red-50 text-red-700 border-red-100"
        )}>
          {status === 'pending' ? <Clock className="h-3 w-3 mr-1" /> : null}
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Submitted",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
        {format(new Date(row.original.created_at), "MMM dd, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button aria-label="View Details"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button aria-label="Delete"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
