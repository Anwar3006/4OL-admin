"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const subscriptionColumns: ColumnDef<any>[] = [
  {
    accessorKey: "plan",
    header: "Plan Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.plan_name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.billing_cycle}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <div className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        ${row.original.price}
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
    accessorKey: "users",
    header: "Subscribers",
    cell: ({ row }) => (
      <div className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
        {row.original.subscriber_count || 0} Users
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const subscription = row.original;
      return (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="View Details"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // View handler will be added in page component
            }}
          >
            👁️
          </button>
          <button aria-label="Edit"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Edit handler will be added in page component
            }}
          >
            ✏️
          </button>
          <button aria-label="Delete"
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
