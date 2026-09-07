"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatProcessedAt } from "./transactionColumns";
import { formatCurrency } from "@/lib/format";
import {
  useRefunds,
  useFileRefund,
  useDecideRefund,
  type RefundRow,
} from "@/features/transactions/data/useTransactions";

const REASON_LABELS: Record<string, string> = {
  accidental_purchase: "Accidental Purchase",
  duplicate_charge: "Duplicate Charge",
  service_not_received: "Service Not Received",
  technical_error: "Technical Error",
  other: "Other",
};

const STATUS_BADGES: Record<RefundRow["status"], string> = {
  pending_approval: "badge-amber",
  processed: "badge-green",
  rejected: "badge-red",
};

export default function RefundsTab() {
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("other");
  const [notes, setNotes] = useState("");

  const { data, isLoading, isError, error } = useRefunds(status || undefined);
  const fileRefund = useFileRefund();
  const decide = useDecideRefund();

  const refunds = data?.refunds ?? [];

  const handleSubmit = () => {
    if (!reference.trim()) return;
    fileRefund.mutate(
      {
        reference: reference.trim(),
        amount: amount ? parseFloat(amount) : undefined,
        reason,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setReference("");
          setAmount("");
          setReason("other");
          setNotes("");
        },
      },
    );
  };

  const columns = useMemo<ColumnDef<RefundRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "REF ID",
        cell: ({ row }) => (
          <span className="font-mono text-2xs text-slate-500 font-bold">
            REF-{row.original.id.slice(0, 8).toUpperCase()}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-400">
            {formatProcessedAt(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "payer",
        header: "Payer",
        cell: ({ row }) => (
          <div>
            <span className="font-black text-slate-800">
              {row.original.transactions?.payer_name || "—"}
            </span>
            <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest">
              {row.original.transactions?.reference ?? "no linked charge"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-tight">
            {REASON_LABELS[row.original.reason] ?? row.original.reason}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-black text-amber-600">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`badge ${STATUS_BADGES[row.original.status]}`}>
            {row.original.status.replace("_", " ")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "pending_approval" ? (
            <div className="flex items-center justify-end gap-1">
              <button
                disabled={decide.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  decide.mutate({ id: row.original.id, decision: "approve" });
                }}
                className="h-7 px-2 rounded-lg border border-emerald-200 text-3xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={decide.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  decide.mutate({ id: row.original.id, decision: "reject" });
                }}
                className="h-7 px-2 rounded-lg border border-red-200 text-3xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : null,
      },
    ],
    [decide],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 px-3 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest bg-white outline-none"
        >
          <option value="">All Refunds</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="processed">Processed</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => setDialogOpen(true)}
          className="h-9 px-4 rounded-xl bg-ek-green text-white text-2xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
        >
          + New Refund
        </button>
        <span className="text-3xs font-bold text-slate-300 uppercase tracking-widest">
          Approvals are restricted to super admins
        </span>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={refunds} isLoading={isLoading} isError={isError} error={error} />
        {refunds.length === 0 && !isLoading && (
          <div className="p-6 text-center text-2xs font-bold text-slate-400 uppercase tracking-widest">
            No refunds filed yet.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              🔄 New Refund Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs font-bold">
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Charge Reference (Payment ID)
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="TXN-… / BACKFILL-SUB-…"
              />
            </div>
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Amount (leave blank for full refund)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="₵"
              />
            </div>
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white outline-none"
              >
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={fileRefund.isPending || !reference.trim()}
              className="btn btn-primary w-full text-white font-black uppercase text-2xs tracking-widest disabled:opacity-50"
            >
              {fileRefund.isPending ? "Filing…" : "File Refund for Approval"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
