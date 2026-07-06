"use client";

import React, { useState } from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
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

  const columns: Column<LoggedReminderRow>[] = [
    {
      key: "drug_name",
      label: "Drug Name",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          {row.drug_color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.drug_color }}
            />
          )}
          <div>
            <div className="font-bold text-slate-800">{val}</div>
            {row.generic_name && (
              <div className="text-[10px] text-slate-400">
                {row.generic_name}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "drug_type",
      label: "Type",
      render: (val, row) => (
        <span className="text-[11px] font-medium text-slate-600 capitalize">
          {row.drug_type || "—"}
        </span>
      ),
    },
    {
      key: "user_profiles",
      label: "Logged By",
      render: (val, row) => (
        <span className="font-medium text-slate-700">
          {row.user_profiles?.name || "Unknown User"}
        </span>
      ),
    },
    {
      key: "dosage_amount",
      label: "Dosage",
      render: (val, row) => <span>{row.dosage_amount || "—"}</span>,
    },
    {
      key: "interval",
      label: "Interval",
      render: (val, row) => (
        <span>{formatReminderInterval(row.interval, row.interval_unit)}</span>
      ),
    },
    {
      key: "is_enabled",
      label: "Status",
      render: (val, row) => {
        const status = getReminderStatus(row);
        const config = {
          complete: { className: "badge-blue", label: "✅ Complete" },
          active: { className: "badge-green", label: "✅ Active" },
          paused: { className: "badge-red", label: "⏸️ Paused" },
        }[status];

        return (
          <span className={cn("badge", config.className)}>{config.label}</span>
        );
      },
    },
    {
      key: "created_at",
      label: "Logged On",
      render: (val, row) => (
        <span className="text-[10px] font-bold text-slate-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (val, row) => (
        <div className="flex gap-2 md:gap-6">
          <button
            className="hover:bg-emerald-200 cursor-pointer"
            onClick={() => openView(row.id)}
          >
            👁️
          </button>
          <button className="text-red-500 hover:bg-red-700" onClick={() => {}}>
            🗑️
          </button>
        </div>
      ),
    },
  ];

  // const rowActions: RowAction<LoggedReminderRow>[] = [
  //   { label: "View", icon: "👁️", onClick: (row) => openView(row.id) },
  //   { label: "Delete", icon: "🗑️", onClick: () => {}, danger: true },
  // ];

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
          selectable
          // rowActions={rowActions}
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
