"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  formatEnqId,
  formatSubmittedAt,
  elapsedHours,
  TypeBadge,
} from "./medEnquiryColumns";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import {
  useMedEnquiries,
  useMedEnquiryAction,
  useBroadcastEnquiry,
  type MedEnquiryRow,
} from "@/features/medenquiry/data/useMedEnquiry";
import EnquiryDetailDialog from "./EnquiryDetailDialog";

/**
 * Pending / unmatched enquiries — Part AB. Zero-response enquiries are
 * highlighted; admins can broadcast to regional pharmacies or alert the user.
 */
export default function PendingEnquiriesTab() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MedEnquiryRow | null>(null);

  const { data, isLoading, isError, error } = useMedEnquiries({
    page,
    limit: 25,
    status: "pending_match",
  });

  const action = useMedEnquiryAction();
  const broadcast = useBroadcastEnquiry();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

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
              {[row.original.dosage, row.original.quantity ? `${row.original.quantity} ${row.original.unit ?? "units"}` : null]
                .filter(Boolean)
                .join(" · ") || "—"}
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
        id: "type",
        header: "Type",
        cell: ({ row }) => <TypeBadge type={row.original.enquiry_type} />,
      },
      {
        id: "responses",
        header: "Responses",
        cell: ({ row }) => (
          <span className="text-xs font-black text-amber-500">
            {row.original.response_count} response{row.original.response_count === 1 ? "" : "s"}
          </span>
        ),
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
      {
        id: "elapsed",
        header: "Elapsed",
        cell: ({ row }) => {
          const hours = (Date.now() - new Date(row.original.created_at).getTime()) / 3_600_000;
          return (
            <span
              className={`text-xs font-black ${hours >= 24 ? "text-red-500" : hours >= 6 ? "text-amber-500" : "text-slate-500"}`}
            >
              {elapsedHours(row.original.created_at)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const enq = row.original;
          const busy = action.isPending || broadcast.isPending;
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
                disabled={busy}
                className="h-7 px-2 rounded-lg border border-amber-200 text-3xs font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  broadcast.mutate({ id: enq.id });
                }}
              >
                📣 Broadcast
              </button>
              <button
                disabled={busy}
                className="h-7 px-2 rounded-lg border border-blue-200 text-3xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  action.mutate({ id: enq.id, action: "notify_user" });
                }}
              >
                Notify User
              </button>
            </div>
          );
        },
      },
    ],
    [action, broadcast],
  );

  const cardConfig: MobileCardConfig<MedEnquiryRow> = {
    header: {
      title: (row) => row.medication_name,
      subtitle: (row) => `${formatEnqId(row.id)} · ${row.submitter_name}`,
      badge: (row) => (
        <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-100">
          {elapsedHours(row.created_at)}
        </span>
      ),
    },
    fields: [
      { id: "responses", label: "Responses", render: (row) => String(row.response_count) },
      { id: "submitted", label: "Submitted", render: (row) => formatSubmittedAt(row.created_at) },
    ],
    actions: [
      { label: "View Details", onClick: (row) => setDetail(row) },
      { label: "📣 Broadcast", onClick: (row) => broadcast.mutate({ id: row.id }) },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {total > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-base leading-none mt-0.5">🔗</span>
          <p className="text-xs font-bold text-amber-700">
            <b>{total} enquiry{total === 1 ? "" : "ies"}</b> have not been matched to a pharmacy yet.
            Consider broadcasting to more pharmacies or alerting the user.
          </p>
        </div>
      )}

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
    </div>
  );
}
