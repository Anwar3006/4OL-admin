"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import KpiCard from "@/components/redesign/KpiCard";
import { cn } from "@/lib/utils";
import {
  useMedicationAdherence,
  AdherenceLogRow,
} from "@/features/medication-reminder/data/useMedicationReminder";
import { useDrugAdherenceStats } from "@/features/medication-reminder/data/useDrugs";

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
  const [showLogs, setShowLogs] = useState(false);

  const { data, isLoading } = useMedicationAdherence({
    pageIndex,
    pageSize: PAGE_SIZE,
    status: statusFilter,
  });

  // Aggregate-only per-drug view (mockup) via get_drug_adherence_stats RPC.
  const { data: drugStats, isLoading: statsLoading } = useDrugAdherenceStats();

  const aggregate = useMemo(() => {
    const rows = drugStats ?? [];
    const activeReminders = rows.reduce((sum, r) => sum + Number(r.active_reminders || 0), 0);
    const missed30d = rows.reduce((sum, r) => sum + Number(r.missed_30d || 0), 0);
    const logCount = rows.length;
    const avgAdherence = logCount
      ? rows.reduce((sum, r) => sum + Number(r.adherence_rate || 0), 0) / logCount
      : 0;
    return { activeReminders, missed30d, avgAdherence };
  }, [drugStats]);

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

  const aggregateRows = useMemo(() => drugStats ?? [], [drugStats]);

  const drugColumns = useMemo<ColumnDef<(typeof aggregateRows)[number]>[]>(
    () => [
      {
        accessorKey: "drug_name",
        header: "Drug Name",
        cell: ({ row }) => (
          <span className="font-bold text-slate-800">{row.original.drug_name}</span>
        ),
      },
      {
        accessorKey: "active_reminders",
        header: "Active Reminders",
        cell: ({ row }) => (
          <span className="text-xs font-black text-slate-700">
            {Number(row.original.active_reminders || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "adherence_rate",
        header: "Adherence Rate",
        cell: ({ row }) => {
          const rate = Number(row.original.adherence_rate || 0);
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500",
                  )}
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
              <span className="text-[11px] font-black text-slate-700 w-10 text-right">{rate}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: "missed_30d",
        header: "Missed (30d)",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-red-600">
            {Number(row.original.missed_30d || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "avg_doses_per_day",
        header: "Avg Doses/Day",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-600">
            {Number(row.original.avg_doses_per_day || 0).toFixed(1)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* Privacy notice — aggregate-only view (mockup) */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500 font-medium">
        <span>🔒</span>
        <span>
          Adherence data is shown as <strong>aggregate per-drug statistics</strong> only.
          Individual dose logs are available in the drill-down below for compliance review.
        </span>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="✅"
          label="Active Reminders"
          value={aggregate.activeReminders.toLocaleString()}
          variant="green"
          isLoading={statsLoading}
        />
        <KpiCard
          icon="📊"
          label="Avg Adherence Rate"
          value={`${aggregate.avgAdherence.toFixed(1)}%`}
          variant="gold"
          isLoading={statsLoading}
        />
        <KpiCard
          icon="❌"
          label="Missed Doses (30d)"
          value={aggregate.missed30d.toLocaleString()}
          variant="red"
          isLoading={statsLoading}
        />
        <KpiCard
          icon="📨"
          label="Notification Open Rate"
          value="—"
          variant="blue"
          isEmpty
          emptyLabel="See Notifications"
        />
      </div>

      {/* Per-drug aggregate table */}
      <div className="card p-0 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
        <DataTable
          columns={drugColumns}
          data={aggregateRows}
          isLoading={statsLoading}
          selectable={false}
        />
      </div>

      {/* Drill-down toggle → log-level table (existing view) */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowLogs((v) => !v)}
        >
          {showLogs ? "▲ Hide Individual Logs" : "▼ Drill Down: Individual Dose Logs"}
        </button>
      </div>

      {showLogs && (
      <>
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
      </>
      )}
    </div>
  );
}
