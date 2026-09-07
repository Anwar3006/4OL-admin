"use client";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { MedEnquiryRow } from "@/features/medenquiry/data/useMedEnquiry";
import { formatCurrency } from "@/lib/format";

export const STATUS_LABELS: Record<string, string> = {
  pending_match: "Pending Match",
  matched: "Matched",
  in_escrow: "In Escrow",
  pickup_ready: "Pickup Ready",
  delivery_in_progress: "Delivery in Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  pending_match: "bg-amber-50 text-amber-700 border-amber-100",
  matched: "bg-emerald-50 text-emerald-700 border-emerald-100",
  in_escrow: "bg-indigo-50 text-indigo-700 border-indigo-100",
  pickup_ready: "bg-teal-50 text-teal-700 border-teal-100",
  delivery_in_progress: "bg-blue-50 text-blue-700 border-blue-100",
  completed: "bg-sky-50 text-sky-700 border-sky-100",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export const TYPE_LABELS: Record<string, string> = {
  with_rx: "With Rx",
  otc: "OTC",
  hcp_request: "HCP Rx Request",
};

const TYPE_STYLES: Record<string, string> = {
  with_rx: "bg-blue-50 text-blue-700 border-blue-100",
  otc: "bg-indigo-50 text-indigo-700 border-indigo-100",
  hcp_request: "bg-purple-50 text-purple-700 border-purple-100",
};

export const formatEnqId = (id: string) => `ENQ-${String(id).slice(0, 6).toUpperCase()}`;

export const formatMoney = (amount: number | null | undefined) =>
  formatCurrency(amount, { fallback: "—" });

export const formatSubmittedAt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const elapsedHours = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.floor(diff / 3_600_000));
  return hours < 24 ? `${hours}hrs` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
      STATUS_STYLES[status] ?? STATUS_STYLES.cancelled,
    )}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

export const TypeBadge = ({ type }: { type: string | null }) => {
  const key = type ?? "otc";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest border",
        TYPE_STYLES[key] ?? TYPE_STYLES.otc,
      )}
    >
      {TYPE_LABELS[key] ?? key}
    </span>
  );
};

export const medEnquiryColumns: ColumnDef<MedEnquiryRow>[] = [
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
    header: "Medication Requested",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-xs uppercase tracking-tight leading-none mb-1">
          {row.original.medication_name}
        </div>
        <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
          {[row.original.dosage, row.original.quantity ? `${row.original.quantity} ${row.original.unit ?? "units"}` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>
    ),
  },
  {
    id: "enquiry_type",
    header: "Type",
    cell: ({ row }) => <TypeBadge type={row.original.enquiry_type} />,
  },
  {
    id: "submitted_by",
    header: "Submitted By",
    cell: ({ row }) => (
      <div>
        <div className="font-bold text-slate-700 text-xs leading-none mb-1">
          {row.original.submitter_name}
          {row.original.identity_masked && <span className="ml-1 text-slate-300">🔒</span>}
        </div>
        <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.submitter_region ?? "—"}
        </div>
      </div>
    ),
  },
  {
    id: "prescription",
    header: "Rx",
    cell: ({ row }) =>
      row.original.prescription_url ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
          📋 Attached
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200">
          None
        </span>
      ),
  },
  {
    id: "responses",
    header: "Responses",
    cell: ({ row }) => (
      <div>
        <div
          className={cn(
            "text-xs font-black leading-none mb-1",
            row.original.response_count > 0 ? "text-emerald-600" : "text-amber-500",
          )}
        >
          {row.original.response_count} response{row.original.response_count === 1 ? "" : "s"}
        </div>
        {row.original.best_price !== null && (
          <div className="text-3xs text-slate-400 font-bold leading-none">
            Best {formatMoney(row.original.best_price)}
            {row.original.best_pharmacy ? ` · ${row.original.best_pharmacy}` : ""}
          </div>
        )}
      </div>
    ),
  },
  {
    id: "fulfilment",
    header: "Fulfilment",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest border",
            row.original.fulfilment_mode === "delivery"
              ? "bg-blue-50 text-blue-600 border-blue-100"
              : "bg-teal-50 text-teal-600 border-teal-100",
          )}
        >
          {row.original.fulfilment_mode === "delivery" ? "🚚 Delivery" : "🏪 Pickup"}
        </span>
        {row.original.escrow_status && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
            🔒 Escrow
          </span>
        )}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: "Submitted",
    cell: ({ row }) => (
      <span className="text-2xs font-bold text-slate-400 uppercase tracking-tight">
        {formatSubmittedAt(row.original.created_at)}
      </span>
    ),
  },
];
