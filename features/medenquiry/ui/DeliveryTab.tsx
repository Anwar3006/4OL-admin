"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { formatEnqId } from "./medEnquiryColumns";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import {
  useMedEnquiries,
  useMedEnquiryAction,
  type MedEnquiryRow,
} from "@/features/medenquiry/data/useMedEnquiry";
import EnquiryDetailDialog from "./EnquiryDetailDialog";

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  preparing: "bg-slate-100 text-slate-500 border-slate-200",
  picked_up: "bg-blue-50 text-blue-700 border-blue-100",
  en_route: "bg-blue-50 text-blue-700 border-blue-100",
  out_for_delivery: "bg-blue-50 text-blue-700 border-blue-100",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

/**
 * Delivery tab — Part AB. Active deliveries to user GPS locations with
 * courier (M-D6: courier_name + metadata, no drivers table) and confirm.
 */
export default function DeliveryTab() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MedEnquiryRow | null>(null);

  const { data, isLoading, isError, error } = useMedEnquiries({
    page,
    limit: 25,
    status: "delivery_in_progress",
  });

  const action = useMedEnquiryAction();

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
          <span className="font-black text-slate-800 text-xs uppercase tracking-tight">
            {row.original.medication_name}
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
        id: "location",
        header: "User Location",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-500">
            {row.original.delivery_address ?? "GPS delivery"}
          </span>
        ),
      },
      {
        id: "driver",
        header: "Assigned Driver",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-500">
            {row.original.courier_name ?? "Unassigned"}
          </span>
        ),
      },
      {
        id: "distance",
        header: "Distance",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-400">
            {row.original.delivery_distance_km != null ? `${row.original.delivery_distance_km}km` : "—"}
          </span>
        ),
      },
      {
        id: "delivery_status",
        header: "Delivery Status",
        cell: ({ row }) => {
          const ds = row.original.delivery_status ?? "en_route";
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-black uppercase tracking-widest border ${
                DELIVERY_STATUS_STYLES[ds] ?? DELIVERY_STATUS_STYLES.en_route
              }`}
            >
              🚚 {ds.replace(/_/g, " ")}
            </span>
          );
        },
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
                Track
              </button>
              <button
                disabled={action.isPending}
                className="h-7 px-2 rounded-lg border border-emerald-200 text-3xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Confirm delivery of ${formatEnqId(enq.id)}? This completes the order.`)) {
                    action.mutate({ id: enq.id, action: "confirm_delivery" });
                  }
                }}
              >
                ✓ Confirm
              </button>
            </div>
          );
        },
      },
    ],
    [action],
  );

  const cardConfig: MobileCardConfig<MedEnquiryRow> = {
    header: {
      title: (row) => row.medication_name,
      subtitle: (row) => `${formatEnqId(row.id)} · ${row.pharmacy_name ?? "Unassigned"}`,
      badge: (row) => (
        <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
          🚚 {row.delivery_status?.replace(/_/g, " ") ?? "En Route"}
        </span>
      ),
    },
    fields: [
      { id: "location", label: "Location", render: (row) => row.delivery_address ?? "GPS delivery" },
      { id: "driver", label: "Driver", render: (row) => row.courier_name ?? "Unassigned" },
    ],
    actions: [
      { label: "Track", onClick: (row) => setDetail(row) },
      {
        label: "✓ Confirm Delivery",
        onClick: (row) => action.mutate({ id: row.id, action: "confirm_delivery" }),
      },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <p className="text-xs font-bold text-blue-700">
          Active deliveries — pharmacies deliver to user GPS locations. Track delivery status and
          confirm completion. {total > 0 && <b>{total} deliver{total === 1 ? "y" : "ies"} in progress.</b>}
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
    </div>
  );
}
