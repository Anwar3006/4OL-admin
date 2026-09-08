"use client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionRow } from "@/features/transactions/data/useTransactions";
import { formatCurrency } from "@/lib/format";

export const CATEGORY_LABELS: Record<TransactionRow["category"], string> = {
  subscription_fee: "Subscription Fee",
  service_fee: "IBP Service Fee",
  product_sale: "Product Sale",
  marketing_fee: "Marketing Fee",
  refund: "Refund",
  payout: "Payout",
};

const STATUS_STYLES: Record<TransactionRow["status"], string> = {
  received: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  processed: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30",
  pending: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  failed: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  refunded: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/30",
  disputed: "bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-100",
  cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
};

const formatMoney = (amount: number) => formatCurrency(amount);

export const formatProcessedAt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const transactionColumns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "reference",
    header: "Payment ID",
    cell: ({ row }) => (
      <span className="font-mono text-2xs font-black text-slate-500 tracking-tighter">
        {row.original.reference}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">
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
        <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
          {row.original.payer_name || "—"}
        </div>
        <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.payer_code}
          {row.original.entity_kind !== "consumer" && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0.5 rounded border text-3xs",
                row.original.entity_kind === "ibp"
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/30"
                  : "bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-100",
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {CATEGORY_LABELS[row.original.category] ?? row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => (
      <span className="text-2xs font-bold text-slate-500 capitalize">
        {row.original.payment_method.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "processed_at",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-2xs font-bold text-slate-400 uppercase tracking-tight">
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
          "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
          STATUS_STYLES[row.original.status] ?? STATUS_STYLES.cancelled,
        )}
      >
        {row.original.status}
      </span>
    ),
  },
];
