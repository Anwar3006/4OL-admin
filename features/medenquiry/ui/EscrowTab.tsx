"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  formatEnqId,
  formatMoney,
} from "./medEnquiryColumns";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import {
  useMedEnquiries,
  useMedEnquiryOverview,
  useEscrowAction,
  type MedEnquiryRow,
} from "@/features/medenquiry/data/useMedEnquiry";
import EnquiryDetailDialog from "./EnquiryDetailDialog";

type EscrowDecision = { enquiry: MedEnquiryRow; action: "release" | "refund" };

/**
 * Escrow tab — Part AB. Payments held until fulfilment is confirmed;
 * release/refund sits behind transactions.manage (finance_admin + SA, M-D3)
 * with a double-confirm + reason dialog.
 */
export default function EscrowTab() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MedEnquiryRow | null>(null);
  const [decision, setDecision] = useState<EscrowDecision | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error } = useMedEnquiries({
    page,
    limit: 25,
    status: "in_escrow",
  });
  const { data: overview } = useMedEnquiryOverview();
  const escrowAction = useEscrowAction();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const totalHeld = overview?.overview?.kpis?.escrow_amount_held;

  const confirmDecision = () => {
    if (!decision) return;
    escrowAction.mutate(
      { id: decision.enquiry.id, action: decision.action, reason: reason.trim() || undefined },
      { onSettled: () => { setDecision(null); setReason(""); } },
    );
  };

  const columns = useMemo<ColumnDef<MedEnquiryRow>[]>(
    () => [
      {
        id: "enquiry_id",
        header: "Enquiry ID",
        cell: ({ row }) => (
          <span className="font-mono text-2xs font-black text-slate-500 tracking-tighter">
            {formatEnqId(row.original.id)}
          </span>
        ),
      },
      {
        id: "medication",
        header: "Medication",
        cell: ({ row }) => (
          <div>
            <div className="font-black text-slate-800 text-xs uppercase tracking-tight leading-none mb-1">
              {row.original.medication_name}
            </div>
            <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
              {row.original.dosage ?? "—"}
            </div>
          </div>
        ),
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-slate-700">
            {row.original.submitter_name}
            {row.original.identity_masked && <span className="ml-1 text-slate-300">🔒</span>}
          </span>
        ),
      },
      {
        id: "pharmacy",
        header: "Pharmacy",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-slate-700">{row.original.pharmacy_name ?? "—"}</span>
        ),
      },
      {
        id: "amount",
        header: "Amount Held",
        cell: ({ row }) => (
          <span className="text-xs font-black text-indigo-600">
            {formatMoney(row.original.escrow_amount ?? row.original.payment_amount)}
          </span>
        ),
      },
      {
        id: "fulfilment",
        header: "Fulfilment",
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest bg-teal-50 text-teal-600 border border-teal-100">
            {row.original.fulfilment_mode === "delivery" ? "🚚 Delivery" : row.original.status === "pickup_ready" ? "🏪 Pickup Ready" : "🏪 Pickup"}
          </span>
        ),
      },
      {
        id: "escrow_status",
        header: "Escrow",
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border bg-indigo-50 text-indigo-700 border-indigo-100">
            🔒 {row.original.escrow_status === "disputed" ? "Disputed" : "Held"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const enq = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                className="h-7 px-2 rounded-lg border border-slate-200 text-3xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetail(enq);
                }}
              >
                View
              </button>
              <button
                className="h-7 px-2 rounded-lg border border-emerald-200 text-3xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDecision({ enquiry: enq, action: "release" });
                }}
              >
                ✓ Release
              </button>
              <button
                className="h-7 px-2 rounded-lg border border-red-200 text-3xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDecision({ enquiry: enq, action: "refund" });
                }}
              >
                ↩ Refund
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const cardConfig: MobileCardConfig<MedEnquiryRow> = {
    header: {
      title: (row) => row.medication_name,
      subtitle: (row) => `${formatEnqId(row.id)} · ${row.pharmacy_name ?? "Unassigned"}`,
      badge: (row) => (
        <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-100">
          {formatMoney(row.escrow_amount ?? row.payment_amount)}
        </span>
      ),
    },
    fields: [
      { id: "user", label: "User", render: (row) => row.submitter_name },
      { id: "fulfilment", label: "Fulfilment", render: (row) => row.fulfilment_mode ?? "—" },
    ],
    actions: [
      { label: "View Details", onClick: (row) => setDetail(row) },
      { label: "✓ Release", onClick: (row) => setDecision({ enquiry: row, action: "release" }) },
      { label: "↩ Refund", onClick: (row) => setDecision({ enquiry: row, action: "refund" }) },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <p className="text-xs font-bold text-blue-700">
          <b>Escrow System:</b> Payments are held until fulfilment is confirmed by both user and
          pharmacy. Finance admins can release or refund funds in case of disputes.
          {totalHeld !== undefined && totalHeld !== null && (
            <> Total held: <b>{formatMoney(totalHeld)}</b></>
          )}
        </p>
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

      <EnquiryDetailDialog enquiry={detail} onClose={() => setDetail(null)} />

      <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && (setDecision(null), setReason(""))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {decision?.action === "release" ? "✓ Release Escrow" : "↩ Refund Escrow"}
            </DialogTitle>
          </DialogHeader>
          {decision && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600">
                {decision.action === "release"
                  ? `Release ${formatMoney(decision.enquiry.escrow_amount ?? decision.enquiry.payment_amount)} to ${decision.enquiry.pharmacy_name ?? "the pharmacy"} for ${decision.enquiry.medication_name}? This writes a product-sale entry to the platform ledger.`
                  : `Refund ${formatMoney(decision.enquiry.escrow_amount ?? decision.enquiry.payment_amount)} to ${decision.enquiry.submitter_name} and cancel enquiry ${formatEnqId(decision.enquiry.id)}?`}
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (optional, logged to the audit trail)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setDecision(null); setReason(""); }}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-2xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDecision}
                  disabled={escrowAction.isPending}
                  className={`h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest text-white disabled:opacity-50 ${
                    decision.action === "release" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {escrowAction.isPending ? "Processing…" : decision.action === "release" ? "Confirm Release" : "Confirm Refund"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
