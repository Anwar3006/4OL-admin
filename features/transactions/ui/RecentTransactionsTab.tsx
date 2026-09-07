"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  transactionColumns,
  CATEGORY_LABELS,
  formatProcessedAt,
} from "./transactionColumns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import {
  useTransactions,
  useTransactionAction,
  useRequestRefund,
  type TransactionRow,
} from "@/features/transactions/data/useTransactions";

const SEGMENTS = [
  { value: "all", label: "All Transactions" },
  { value: "user", label: "👤 Users" },
  { value: "business", label: "🏢 Businesses (IBP / Facility)" },
];

const CATEGORIES = [
  { value: "", label: "All Types" },
  { value: "subscription_fee", label: "Subscription Fee" },
  { value: "service_fee", label: "IBP Service Fee" },
  { value: "product_sale", label: "Product Sale" },
  { value: "marketing_fee", label: "Marketing Fee" },
  { value: "refund", label: "Refund" },
  { value: "payout", label: "Payout" },
];

const MORE_FILTERS = [
  { value: "", label: "All Rows" },
  { value: "failed", label: "Failed Only" },
  { value: "pending", label: "Pending Only" },
  { value: "highValue", label: "High Value (>₵500)" },
];

export default function RecentTransactionsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState<"all" | "user" | "business">("all");
  const [category, setCategory] = useState("");
  const [moreFilter, setMoreFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<TransactionRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error } = useTransactions({
    page,
    limit: 25,
    q: debouncedSearch || undefined,
    segment,
    category: category || undefined,
    failedOnly: moreFilter === "failed" || undefined,
    pendingOnly: moreFilter === "pending" || undefined,
    highValue: moreFilter === "highValue" || undefined,
  });

  const action = useTransactionAction();
  const refund = useRequestRefund();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const handleExport = () => {
    downloadCsv(
      rows.map((row) => ({
        reference: row.reference,
        amount: row.amount,
        payer: row.payer_name,
        payer_code: row.payer_code,
        segment: row.payer_class,
        category: CATEGORY_LABELS[row.category] ?? row.category,
        method: row.payment_method,
        date: formatProcessedAt(row.processed_at),
        status: row.status,
      })),
      "transactions-export",
    );
  };

  const actionColumn = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const txn = row.original;
          const busy = action.isPending || refund.isPending;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                className="h-7 px-2 rounded-lg border border-slate-200 text-3xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetail(txn);
                }}
              >
                View
              </button>
              {txn.status === "failed" && (
                <button
                  disabled={busy}
                  className="h-7 px-2 rounded-lg border border-amber-200 text-3xs font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.mutate({ id: txn.id, action: "retry" });
                  }}
                >
                  Retry
                </button>
              )}
              {txn.direction === "in" && txn.status !== "refunded" && txn.status !== "failed" && (
                <button
                  disabled={busy}
                  className="h-7 px-2 rounded-lg border border-purple-200 text-3xs font-black uppercase tracking-widest text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    refund.mutate({ transactionId: txn.id, reason: "other" });
                  }}
                >
                  Refund
                </button>
              )}
              {txn.status !== "disputed" && txn.status !== "cancelled" && txn.status !== "failed" && (
                <button
                  disabled={busy}
                  className="h-7 px-2 rounded-lg border border-orange-200 text-3xs font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.mutate({ id: txn.id, action: "dispute" });
                  }}
                >
                  Dispute
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [action, refund],
  );

  const columns = useMemo(
    () => [...transactionColumns, ...actionColumn],
    [actionColumn],
  );

  const cardConfig: MobileCardConfig<TransactionRow> = {
    header: {
      title: (row) => row.payer_name || row.reference,
      subtitle: (row) => row.reference,
      badge: (row) => (
        <span
          className={`text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            row.status === "failed"
              ? "bg-red-50 text-red-700 border-red-100"
              : row.status === "pending"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    fields: [
      { id: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
      { id: "category", label: "Type", render: (row) => CATEGORY_LABELS[row.category] ?? row.category },
    ],
    actions: [{ label: "View Details", onClick: (row) => setDetail(row) }],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search transactions..."
        />
        <select
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value as "all" | "user" | "business");
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest bg-white outline-none"
        >
          {SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest bg-white outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={moreFilter}
          onChange={(e) => {
            setMoreFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest bg-white outline-none"
        >
          {MORE_FILTERS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-2xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
        >
          📥 Export Data
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => setDetail(row)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: total,
            pageSize: 25,
            onPageChange: setPage,
            onNextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
            onPreviousPage: () => setPage((p) => Math.max(p - 1, 1)),
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {detail?.reference}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-xs font-bold">
              {[
                ["Amount", `${formatCurrency(detail.amount)} ${detail.currency}`],
                ["Payer", `${detail.payer_name || "—"} (${detail.payer_code})`],
                ["Segment", detail.payer_class === "business" ? "Business" : "User"],
                ["Type", CATEGORY_LABELS[detail.category] ?? detail.category],
                ["Method", detail.payment_method.replace(/_/g, " ")],
                ["Status", detail.status.toUpperCase()],
                ["Date", formatProcessedAt(detail.processed_at)],
                ["Source", detail.source],
                ...(detail.failure_reason ? [["Failure Reason", detail.failure_reason] as const] : []),
                ...(detail.plan_key ? [["Plan", detail.plan_key] as const] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="text-slate-800 uppercase tracking-tight">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
