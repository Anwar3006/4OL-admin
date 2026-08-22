"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { formatMoney } from "@/components/Data-Table/columns/medEnquiryColumns";
import { useDisputes, useResolveDispute, type DisputeRow } from "@/hooks/supabase-calls/useMedEnquiry";

type Verdict = "release_to_pharmacy" | "refund_user";
type VerdictDecision = { dispute: DisputeRow; verdict: Verdict };

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

/**
 * Escrow disputes — Part AB. Funds stay held until a verdict; resolution is
 * super-admin only (M-D4, enforced server-side — non-SA users see a 403 toast).
 */
export default function DisputesTab() {
  const { data, isLoading, isError, error } = useDisputes();
  const resolve = useResolveDispute();
  const [detail, setDetail] = useState<DisputeRow | null>(null);
  const [decision, setDecision] = useState<VerdictDecision | null>(null);
  const [notes, setNotes] = useState("");

  const rows = data?.rows ?? [];

  const confirmVerdict = () => {
    if (!decision) return;
    resolve.mutate(
      { id: decision.dispute.id, verdict: decision.verdict, resolution_notes: notes.trim() || undefined },
      { onSettled: () => { setDecision(null); setNotes(""); } },
    );
  };

  const columns = useMemo<ColumnDef<DisputeRow>[]>(
    () => [
      {
        id: "reference",
        header: "Escrow Ref",
        cell: ({ row }) => (
          <span className="font-mono text-[10px] font-black text-slate-500 tracking-tighter">
            {row.original.transaction_reference ?? row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: "medication",
        header: "Medication",
        cell: ({ row }) => (
          <span className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
            {row.original.enquiry?.medication_name ?? "—"}
          </span>
        ),
      },
      {
        id: "claim",
        header: "Dispute Claim",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-red-600">{row.original.dispute_reason ?? "—"}</span>
        ),
      },
      {
        id: "parties",
        header: "User / Pharmacy",
        cell: ({ row }) => {
          const user = row.original.enquiry?.user;
          return (
            <div className="text-[10px] font-bold text-slate-500">
              {user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "User" : "User"}
              <span className="block text-slate-400">{row.original.enquiry?.pharmacy?.facility_name ?? "—"}</span>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-indigo-600">{formatMoney(row.original.amount)}</span>
        ),
      },
      {
        id: "opened",
        header: "Opened",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            {formatDate(row.original.dispute_raised_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const dispute = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                className="h-7 px-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetail(dispute);
                }}
              >
                👀 Review
              </button>
              <button
                className="h-7 px-2 rounded-lg border border-emerald-200 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDecision({ dispute, verdict: "release_to_pharmacy" });
                }}
              >
                Release to Pharmacy
              </button>
              <button
                className="h-7 px-2 rounded-lg border border-red-200 text-[9px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDecision({ dispute, verdict: "refund_user" });
                }}
              >
                📋 Refund User
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const cardConfig: MobileCardConfig<DisputeRow> = {
    header: {
      title: (row) => row.enquiry?.medication_name ?? "Escrow Dispute",
      subtitle: (row) => row.transaction_reference ?? row.id.slice(0, 8),
      badge: (row) => (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-100">
          {formatMoney(row.amount)}
        </span>
      ),
    },
    fields: [
      { id: "claim", label: "Claim", render: (row) => row.dispute_reason ?? "—" },
      { id: "opened", label: "Opened", render: (row) => formatDate(row.dispute_raised_at) },
    ],
    actions: [{ label: "👀 Review", onClick: (row) => setDetail(row) }],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <p className="text-[11px] font-bold text-red-700">
          {rows.length > 0 ? (
            <>
              <b>{rows.length} escrow dispute{rows.length === 1 ? "" : "s"}</b> require{rows.length === 1 ? "s" : ""} admin
              resolution — funds cannot be released until the dispute is resolved. Resolution is
              restricted to the super admin.
            </>
          ) : (
            <>No open escrow disputes. Disputes raised by users or pharmacies will appear here for super-admin resolution.</>
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
        />
      </div>

      {/* Review dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              Dispute Review
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-xs font-bold">
              {[
                ["Escrow Ref", detail.transaction_reference ?? detail.id.slice(0, 8)],
                ["Medication", detail.enquiry?.medication_name ?? "—"],
                ["Claim", detail.dispute_reason ?? "—"],
                ["Amount", formatMoney(detail.amount)],
                ["Fulfilment", detail.enquiry?.fulfilment_mode ?? "—"],
                ["Opened", formatDate(detail.dispute_raised_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="text-slate-800 uppercase tracking-tight text-right">{value}</span>
                </div>
              ))}
              {detail.enquiry?.delivery_proof_url && (
                <a
                  href={detail.enquiry.delivery_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                >
                  📷 Delivery Proof
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verdict dialog (double-confirm + notes) */}
      <Dialog open={Boolean(decision)} onOpenChange={(open) => !open && (setDecision(null), setNotes(""))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {decision?.verdict === "release_to_pharmacy" ? "Release to Pharmacy" : "Refund User"}
            </DialogTitle>
          </DialogHeader>
          {decision && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-600">
                {decision.verdict === "release_to_pharmacy"
                  ? `Release ${formatMoney(decision.dispute.amount)} to the pharmacy and close enquiry ${decision.dispute.enquiry?.medication_name ?? ""}? This is final and writes a ledger entry.`
                  : `Refund ${formatMoney(decision.dispute.amount)} to the user and cancel the enquiry? This is final and writes a refund ledger entry.`}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Resolution notes (logged with the verdict)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setDecision(null); setNotes(""); }}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVerdict}
                  disabled={resolve.isPending}
                  className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 ${
                    decision.verdict === "release_to_pharmacy"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {resolve.isPending ? "Resolving…" : "Confirm Verdict"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
