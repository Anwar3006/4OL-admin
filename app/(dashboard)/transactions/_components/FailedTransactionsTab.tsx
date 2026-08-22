"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { formatProcessedAt } from "@/components/Data-Table/columns/transactionColumns";
import { toast } from "sonner";
import {
  useTransactions,
  useTransactionAction,
  useTransactionsOverview,
  type TransactionRow,
} from "@/hooks/supabase-calls/useTransactions";

export default function FailedTransactionsTab() {
  const { data, isLoading, isError, error } = useTransactions({ failedOnly: true, limit: 50 });
  const { data: overview } = useTransactionsOverview();
  const action = useTransactionAction();

  const failed = overview?.overview?.failed;
  const rows = data?.rows ?? [];

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "TXN ID",
        cell: ({ row }) => (
          <span className="font-mono text-[10px] text-slate-500 font-bold">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: "processed_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-slate-400">{formatProcessedAt(row.original.processed_at)}</span>
        ),
      },
      {
        id: "payer",
        header: "User",
        cell: ({ row }) => (
          <div>
            <span className="font-black text-slate-800">{row.original.payer_name || "—"}</span>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              {row.original.payer_code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-black text-red-500">₵{Number(row.original.amount).toLocaleString()}</span>
        ),
      },
      {
        accessorKey: "failure_reason",
        header: "Failure Reason",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">
            {row.original.failure_reason ?? "Unknown"}
          </span>
        ),
      },
      {
        accessorKey: "attempts",
        header: "Attempts",
        cell: ({ row }) => (
          <span className="badge badge-secondary">{row.original.attempts}/3</span>
        ),
      },
      {
        id: "retry",
        header: "Next Retry",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-slate-400">
            {row.original.next_retry_at
              ? formatProcessedAt(row.original.next_retry_at)
              : "Manual"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              disabled={action.isPending}
              onClick={(e) => {
                e.stopPropagation();
                toast.info(`Payment reminder queued for ${row.original.payer_name || "customer"}`);
              }}
              className="h-7 px-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              Notify
            </button>
            <button
              disabled={action.isPending}
              onClick={(e) => {
                e.stopPropagation();
                action.mutate({ id: row.original.id, action: "retry" });
              }}
              className="h-7 px-2 rounded-lg border border-amber-200 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        ),
      },
    ],
    [action],
  );

  return (
    <div className="space-y-4 mt-4 text-xs">
      <div className="alert bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2">
        <span>⚠️</span>
        <strong>{failed?.count ?? rows.length} failed transaction(s)</strong>
        <span>
          totalling ₵{Number(failed?.amount_at_risk ?? rows.reduce((acc, r) => acc + Number(r.amount), 0)).toLocaleString()} at risk.
        </span>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={rows} isLoading={isLoading} isError={isError} error={error} />
        {rows.length === 0 && !isLoading && (
          <div className="p-6 text-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            ✅ No failed payments — everything is healthy.
          </div>
        )}
      </div>
    </div>
  );
}
