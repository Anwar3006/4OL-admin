"use client";

import React, { useState } from "react";
import DataTable, { Column } from "@/components/redesign/DataTable";
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

  const columns: Column<AdherenceLogRow>[] = [
    {
      key: "medication_reminders",
      label: "Drug",
      render: (val, row) => (
        <span className="font-bold text-slate-800">{row.medication_reminders?.drug_name || "Unknown Drug"}</span>
      ),
    },
    {
      key: "user_profiles",
      label: "User",
      render: (val, row) => (
        <span className="font-medium text-slate-700">{row.user_profiles?.name || "Unknown User"}</span>
      ),
    },
    {
      key: "scheduled_time",
      label: "Scheduled",
      render: (val, row) => (
        <span className="text-[10px] font-bold text-slate-400">
          {new Date(row.scheduled_time).toLocaleString()}
        </span>
      ),
    },
    {
      key: "action_time",
      label: "Actioned",
      render: (val, row) => (
        <span className="text-[10px] font-bold text-slate-400">
          {row.action_time ? new Date(row.action_time).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => {
        const badge = STATUS_BADGE[row.status] || STATUS_BADGE.missed;
        return <span className={badge.className}>{badge.label}</span>;
      },
    },
  ];

  return (
    <div className="space-y-4 mt-4">
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
          pagination
          externalPage={pageIndex}
          externalTotalPages={totalPages}
          onPageChange={setPageIndex}
        />
      </div>
    </div>
  );
}
