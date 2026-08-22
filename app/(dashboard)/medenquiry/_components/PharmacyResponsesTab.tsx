"use client";

import React, { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { usePharmacyPerformance, type PharmacyPerfRow } from "@/hooks/supabase-calls/useMedEnquiry";
import { cn } from "@/lib/utils";

const formatMinutes = (minutes: number | null) =>
  minutes === null || minutes === undefined ? "—" : `${Math.round(minutes)} min`;

const StarRating = ({ rating }: { rating: number | null }) => {
  if (rating === null || rating === undefined) return <span className="text-slate-300">—</span>;
  const full = Math.round(rating);
  return (
    <span className="text-[10px] font-black text-amber-500">
      {"⭐".repeat(Math.max(1, Math.min(5, full)))} {Number(rating).toFixed(1)}
    </span>
  );
};

/**
 * Pharmacy Response Performance — Part AB. Leaderboard of how fast and
 * reliably pharmacies/wholesalers respond to enquiries (sourced from the
 * get_med_enquiry_overview RPC; per-enquiry response detail lives in the
 * enquiry detail dialog until the Phase-2 responses UI).
 */
export default function PharmacyResponsesTab() {
  const { data, isLoading, isError, error } = usePharmacyPerformance();
  const rows = data?.rows ?? [];
  const empty = Boolean(data?.empty);

  const columns = useMemo<ColumnDef<PharmacyPerfRow>[]>(
    () => [
      {
        id: "pharmacy",
        header: "Pharmacy / IBP",
        cell: ({ row }) => (
          <span className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
            {row.original.pharmacy_name}
          </span>
        ),
      },
      {
        id: "total_responses",
        header: "Total Responses",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-slate-700">{row.original.total_responses}</span>
        ),
      },
      {
        id: "avg_response_minutes",
        header: "Avg Response Time",
        cell: ({ row }) => {
          const minutes = row.original.avg_response_minutes;
          return (
            <span
              className={cn(
                "text-[11px] font-black",
                minutes !== null && minutes <= 15 ? "text-emerald-600" : "text-amber-500",
              )}
            >
              {formatMinutes(minutes)}
            </span>
          );
        },
      },
      {
        id: "availability_rate",
        header: "Availability Rate",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-[11px] font-black",
              row.original.availability_rate >= 80 ? "text-emerald-600" : "text-amber-500",
            )}
          >
            {Math.round(row.original.availability_rate)}%
          </span>
        ),
      },
      {
        id: "orders_fulfilled",
        header: "Orders Fulfilled",
        cell: ({ row }) => (
          <span className="text-[11px] font-black text-slate-700">{row.original.orders_fulfilled}</span>
        ),
      },
      {
        id: "rating",
        header: "Rating",
        cell: ({ row }) => <StarRating rating={row.original.rating} />,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
              row.original.active === false
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-100",
            )}
          >
            {row.original.active === false ? "Inactive" : "✅ Active"}
          </span>
        ),
      },
    ],
    [],
  );

  const cardConfig: MobileCardConfig<PharmacyPerfRow> = {
    header: {
      title: (row) => row.pharmacy_name,
      subtitle: () => "Pharmacy / IBP",
      badge: (row) => (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
          {row.total_responses} responses
        </span>
      ),
    },
    fields: [
      { id: "avg", label: "Avg Response", render: (row) => formatMinutes(row.avg_response_minutes) },
      { id: "availability", label: "Availability", render: (row) => `${Math.round(row.availability_rate)}%` },
    ],
    actions: [],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div>
        <div className="font-black text-slate-800 text-sm">💊 Pharmacy Response Performance</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          How fast and accurately pharmacies respond to medication enquiries
        </div>
      </div>

      {empty && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-base leading-none mt-0.5">📋</span>
          <p className="text-[11px] font-bold text-slate-500">
            Performance data appears once the Medication Enquiry depth migration
            (<code>20260822_med_enquiry_depth.sql</code>) is applied and pharmacy responses start
            coming in via the <code>enquiry_responses</code> table.
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
          cardConfig={cardConfig}
        />
      </div>
    </div>
  );
}
