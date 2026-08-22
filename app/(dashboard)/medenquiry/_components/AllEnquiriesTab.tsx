"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  medEnquiryColumns,
  formatEnqId,
  formatMoney,
  formatSubmittedAt,
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/components/Data-Table/columns/medEnquiryColumns";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { downloadCsv } from "@/lib/csv-export";
import {
  MED_ENQUIRY_STATUSES,
  useMedEnquiries,
  useMedEnquiryAction,
  type MedEnquiryRow,
} from "@/hooks/supabase-calls/useMedEnquiry";
import { useViewFacilityDialog } from "@/stores/dialog-store";
import EnquiryDetailDialog from "./EnquiryDetailDialog";

const TYPES = [
  { value: "", label: "All Types" },
  { value: "with_rx", label: "With Prescription" },
  { value: "otc", label: "Without Prescription (OTC)" },
  { value: "hcp_request", label: "HCP Prescription Request" },
];

const TIERS = [
  { value: "", label: "All Tiers" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

const OPEN_STATUSES = ["pending_match", "matched", "in_escrow", "pickup_ready", "delivery_in_progress"];

export default function AllEnquiriesTab({ pharmacyId }: { pharmacyId?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewFacility = useViewFacilityDialog();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MedEnquiryRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error } = useMedEnquiries({
    page,
    limit: 25,
    q: debouncedSearch || undefined,
    type: type || undefined,
    status: status || undefined,
    tier: tier || undefined,
    pharmacy: pharmacyId || undefined,
  });

  const clearPharmacyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pharmacy");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const pharmacyFilterName =
    data?.rows?.find((r) => r.pharmacy_name)?.pharmacy_name ?? "Selected pharmacy";

  const action = useMedEnquiryAction();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const handleExport = () => {
    downloadCsv(
      rows.map((row) => ({
        enquiry: formatEnqId(row.id),
        medication: row.medication_name,
        type: TYPE_LABELS[row.enquiry_type ?? "otc"] ?? row.enquiry_type,
        submitted_by: row.submitter_name,
        responses: row.response_count,
        best_price: row.best_price ?? "",
        fulfilment: row.fulfilment_mode,
        status: STATUS_LABELS[row.status] ?? row.status,
        submitted: formatSubmittedAt(row.created_at),
      })),
      "medication-enquiries",
    );
  };

  const actionColumn = useMemo<ColumnDef<MedEnquiryRow>[]>(
    () => [
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const enq = row.original;
          const busy = action.isPending;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                className="h-7 px-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetail(enq);
                }}
              >
                View
              </button>
              {OPEN_STATUSES.includes(enq.status) && (
                <button
                  disabled={busy}
                  className="h-7 px-2 rounded-lg border border-blue-200 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.mutate({ id: enq.id, action: "notify_user" });
                  }}
                >
                  Notify
                </button>
              )}
              {OPEN_STATUSES.includes(enq.status) && (
                <button
                  disabled={busy}
                  className="h-7 px-2 rounded-lg border border-orange-200 text-[9px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Cancel enquiry ${formatEnqId(enq.id)}? The user will be notified.`)) {
                      action.mutate({ id: enq.id, action: "cancel" });
                    }
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [action],
  );

  const columns = useMemo(() => [...medEnquiryColumns, ...actionColumn], [actionColumn]);

  const cardConfig: MobileCardConfig<MedEnquiryRow> = {
    header: {
      title: (row) => row.medication_name,
      subtitle: (row) => `${formatEnqId(row.id)} · ${row.submitter_name}`,
      badge: (row) => (
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            row.status === "pending_match"
              ? "bg-amber-50 text-amber-700 border-amber-100"
              : row.status === "completed" || row.status === "cancelled"
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    fields: [
      {
        id: "responses",
        label: "Responses",
        render: (row) =>
          row.best_price !== null
            ? `${row.response_count} · best ${formatMoney(row.best_price)}`
            : String(row.response_count),
      },
      { id: "fulfilment", label: "Fulfilment", render: (row) => row.fulfilment_mode ?? "—" },
    ],
    actions: [{ label: "View Details", onClick: (row) => setDetail(row) }],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {pharmacyId && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
            🏥 Linked from Facilities — filtering enquiries for:
          </span>
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            {pharmacyFilterName}
            <button
              onClick={() => viewFacility.open(pharmacyId)}
              className="text-emerald-500 hover:text-emerald-800 font-black"
              aria-label="View pharmacy profile"
              title="Open pharmacy profile (Facilities)"
            >
              🏥
            </button>
            <button
              onClick={clearPharmacyFilter}
              className="text-emerald-400 hover:text-emerald-700 font-black"
              aria-label="Clear pharmacy filter"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search by medication, user, pharmacy..."
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
        >
          <option value="">All Status</option>
          {MED_ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
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

      <EnquiryDetailDialog enquiry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
