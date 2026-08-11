"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  useMedicationAdherence,
  AdherenceLogRow,
} from "@/hooks/supabase-calls/useMedicationReminder";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  taken: { label: "✅ Taken", className: "badge badge-green" },
  skipped: { label: "⏭️ Skipped", className: "badge badge-amber" },
  missed: { label: "❌ Missed", className: "badge badge-red" },
};

const STATUS_FILTERS: { id: "taken" | "skipped" | "missed" | undefined; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "taken", label: "Taken" },
  { id: "skipped", label: "Skipped" },
  { id: "missed", label: "Missed" },
];

export default function AdherenceTab() {
  const [pageIndex, setPageIndex] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"taken" | "skipped" | "missed" | undefined>(undefined);

  const { data, isLoading } = useMedicationAdherence({
    pageIndex,
    pageSize: PAGE_SIZE,
    status: statusFilter,
  });

  const rows = data?.logs || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleFilterChange = (status: "taken" | "skipped" | "missed" | undefined) => {
    setStatusFilter(status);
    setPageIndex(1);
  };

  const columns = useMemo<ColumnDef<AdherenceLogRow>[]>(
    () => [
    {
      accessorKey: "medication_reminders",
      header: "Drug",
      cell: ({ row }) => (
        <span className="font-bold text-slate-800">
          {row.original.medication_reminders?.drug_name || "Unknown Drug"}
        </span>
      ),
    },
    {
      accessorKey: "user_profiles",
      header: "User",
      cell: ({ row }) => (
        <span className="font-medium text-slate-700">
          {row.original.user_profiles?.name || "Unknown User"}
        </span>
      ),
    },
    {
      accessorKey: "scheduled_time",
      header: "Scheduled",
      cell: ({ row }) => (
        <span className="text-[10px] font-bold text-slate-400">
          {new Date(row.original.scheduled_time).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "action_time",
      header: "Actioned",
      cell: ({ row }) => (
        <span className="text-[10px] font-bold text-slate-400">
          {row.original.action_time ? new Date(row.original.action_time).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const badge = STATUS_BADGE[row.original.status] || STATUS_BADGE.missed;
        return <span className={badge.className}>{badge.label}</span>;
      },
    },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => handleFilterChange(f.id)}
              className={cn(
                "h-8 px-3 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer",
                statusFilter === f.id
                  ? "bg-ek-green-dark text-white border-ek-green-dark"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm ml-auto">📥 Export</button>
      </div>
      <div className="card p-0 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          pagination={{
            currentPage: pageIndex,
            totalPages: totalPages,
            totalItems: totalCount,
            pageSize: PAGE_SIZE,
            onPageChange: setPageIndex,
            onNextPage: () => setPageIndex((p) => p + 1),
            onPreviousPage: () => setPageIndex((p) => Math.max(1, p - 1)),
            canNextPage: pageIndex < totalPages,
            canPreviousPage: pageIndex > 1,
          }}
        />
      </div>
    </div>
  );
}
