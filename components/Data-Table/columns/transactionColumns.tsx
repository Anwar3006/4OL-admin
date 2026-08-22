"use client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/hooks/supabase-calls/useTransactions";

export const CATEGORY_LABELS: Record<TransactionRow["category"], string> = {
  subscription_fee: "Subscription Fee",
  service_fee: "IBP Service Fee",
  product_sale: "Product Sale",
  marketing_fee: "Marketing Fee",
  refund: "Refund",
  payout: "Payout",
};

const STATUS_STYLES: Record<TransactionRow["status"], string> = {
  received: "bg-emerald-50 text-emerald-700 border-emerald-100",
  processed: "bg-blue-50 text-blue-700 border-blue-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  failed: "bg-red-50 text-red-700 border-red-100",
  refunded: "bg-purple-50 text-purple-700 border-purple-100",
  disputed: "bg-orange-50 text-orange-700 border-orange-100",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const formatMoney = (amount: number) => `₵${Number(amount).toLocaleString()}`;

export const formatProcessedAt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "reference",
    header: "Payment ID",
    cell: ({ row }) => (
      <span className="font-mono text-[10px] font-black text-slate-500 tracking-tighter">
        {row.original.reference}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 tracking-tight">
        {row.original.direction === "in" ? (
          <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
        ) : (
          <ArrowUpRight className="h-3 w-3 text-red-500" />
        )}
        {formatMoney(row.original.amount)}
      </div>
    ),
  },
  {
    id: "payer",
    header: "Name / Entity",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
          {row.original.payer_name || "—"}
        </div>
        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.payer_code}
          {row.original.entity_kind !== "consumer" && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0.5 rounded border text-[8px]",
                row.original.entity_kind === "ibp"
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : "bg-teal-50 text-teal-600 border-teal-100",
              )}
            >
              {row.original.entity_kind === "ibp" ? "IBP" : "Facility"}
            </span>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Payment Type",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
        {CATEGORY_LABELS[row.original.category] ?? row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-500 capitalize">
        {row.original.payment_method.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "processed_at",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
        {formatProcessedAt(row.original.processed_at)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
          STATUS_STYLES[row.original.status] ?? STATUS_STYLES.cancelled,
        )}
      >
        {row.original.status}
      </span>
    ),
  },
];
