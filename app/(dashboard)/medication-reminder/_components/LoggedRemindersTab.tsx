"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useLoggedReminders,
  LoggedReminderRow,
  formatReminderInterval,
  getReminderStatus,
} from "@/hooks/supabase-calls/useMedicationReminder";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";

const PAGE_SIZE = 10;

export default function LoggedRemindersTab() {
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useLoggedReminders({
    pageIndex,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const { open: openView } = useViewMediactionReminderDialog();

  const rows = data?.reminders || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageIndex(1);
  };

  const columns = useMemo<ColumnDef<LoggedReminderRow>[]>(
    () => [
    {
      accessorKey: "drug_name",
      header: "Drug Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.drug_color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.original.drug_color }}
            />
          )}
          <div>
            <div className="font-bold text-slate-800">{row.original.drug_name}</div>
            {row.original.generic_name && (
              <div className="text-[10px] text-slate-400">
                {row.original.generic_name}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "drug_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-[11px] font-medium text-slate-600 capitalize">
          {row.original.drug_type || "—"}
        </span>
      ),
    },
    {
      accessorKey: "user_profiles",
      header: "Logged By",
      cell: ({ row }) => (
        <span className="font-medium text-slate-700">
          {row.original.user_profiles?.name || "Unknown User"}
        </span>
      ),
    },
    {
      accessorKey: "dosage_amount",
      header: "Dosage",
      cell: ({ row }) => <span>{row.original.dosage_amount || "—"}</span>,
    },
    {
      accessorKey: "interval",
      header: "Interval",
      cell: ({ row }) => (
        <span>{formatReminderInterval(row.original.interval, row.original.interval_unit)}</span>
      ),
    },
    {
      accessorKey: "is_enabled",
      header: "Status",
      cell: ({ row }) => {
        const status = getReminderStatus(row.original);
        const config = {
          complete: { className: "badge-blue", label: "✅ Complete" },
          active: { className: "badge-green", label: "✅ Active" },
          paused: { className: "badge-red", label: "⏸️ Paused" },
        }[status];

        return (
          <span className={cn("badge", config?.className)}>{config?.label}</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Logged On",
      cell: ({ row }) => (
        <span className="text-[10px] font-bold text-slate-400">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2 md:gap-6">
          <button
            className="hover:bg-emerald-200 cursor-pointer"
            onClick={() => openView(row.original.id)}
            aria-label="View Reminder"
          >
            👁️
          </button>
          <button className="text-red-500 hover:bg-red-700" onClick={() => {}} aria-label="Delete Reminder">
            🗑️
          </button>
        </div>
      ),
    },
    ],
    [openView],
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search by drug name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <button className="btn btn-secondary btn-sm">📥 Export</button>
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
