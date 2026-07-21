"use client";

import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export const facilitySubscriptionColumns: ColumnDef<any>[] = [
  {
    accessorKey: "facility",
    header: "Facility",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
          {row.original.facility?.facility_name || "—"}
        </div>
        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.facility?.owner_email || "—"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "subscription",
    header: "Plan",
    cell: ({ row }) => (
      <span className="badge badge-purple">
        {row.original.subscription?.name || "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || "pending_payment";
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            status === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : status === "pending_payment"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-red-50 text-red-700 border-red-100",
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "billing_cycle",
    header: "Billing",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        {row.original.billing_cycle || "—"}
      </span>
    ),
  },
  {
    accessorKey: "current_period_end",
    header: "Period End",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-400">
        {row.original.current_period_end
          ? new Date(row.original.current_period_end).toLocaleDateString()
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "auto_renew",
    header: "Auto Renew",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {row.original.auto_renew ? "✅ Yes" : "❌ No"}
      </span>
    ),
  },
];
