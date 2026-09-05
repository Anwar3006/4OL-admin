"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { usePermissionContext } from "@/stores/permission-context";
import { maskName } from "@/lib/masking";
import { toast } from "sonner";
import PharmacyCampaignModal from "./PharmacyCampaignModal";
import { downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 10;

export default function LoggedRemindersTab() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignOpen, setCampaignOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  // PHI policy: full identifiers only for super_admin (permissions === null).
  const { userRole } = usePermissionContext();
  const isSuperAdmin = userRole === "super_admin";

  const { data, isLoading } = useLoggedReminders({
    pageIndex,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const { open: openView } = useViewMediactionReminderDialog();

  const allRows = data?.reminders || [];
  const totalCount = data?.count || 0;

  // Client-side status/form filters (server hook only supports search today).
  const rows = useMemo(() => {
    let filtered = allRows;
    if (formFilter) {
      filtered = filtered.filter(
        (r) => (r.drug_type || "").toLowerCase() === formFilter.toLowerCase(),
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((r) => getReminderStatus(r) === statusFilter);
    }
    return filtered;
  }, [allRows, formFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageIndex(1);
  };

  const handleExport = () => {
    downloadCsv(
      rows.map((r) => ({
        drug_name: r.drug_name,
        drug_type: r.drug_type,
        dosage_amount: r.dosage_amount,
        interval: formatReminderInterval(r.interval, r.interval_unit),
        status: getReminderStatus(r),
        logged_on: new Date(r.created_at).toISOString(),
      })),
      "logged-reminders",
    );
  };

  const columns = useMemo<ColumnDef<LoggedReminderRow>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const name = row.original.user_profiles?.name || "Unknown User";
          const userId = row.original.user_profiles?.user_id;
          return (
            <div>
              <div className="font-medium text-slate-700">
                {isSuperAdmin ? name : maskName(name)}
              </div>
              {userId && (
                <span className="badge badge-slate text-[9px]">
                  4OL-{isSuperAdmin ? userId.slice(0, 6) : "••••••"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "drug_name",
        header: "Medication",
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
        header: "Type / Form",
        cell: ({ row }) => (
          <span className="text-[11px] font-medium text-slate-600 capitalize">
            {row.original.drug_type || "—"}
          </span>
        ),
      },
      {
        accessorKey: "dosage_amount",
        header: "Dose",
        cell: ({ row }) => <span className="text-xs">{row.original.dosage_amount || "—"}</span>,
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <div>
            <div className="text-xs font-medium text-slate-700">
              {formatReminderInterval(row.original.interval, row.original.interval_unit)}
            </div>
            {row.original.notification_schedule && (
              <div className="text-[10px] text-slate-400">
                {row.original.notification_schedule}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const { start_date, end_date } = row.original;
          if (!start_date && !end_date) return <span className="text-xs text-slate-400">—</span>;
          const fmt = (d?: string | null) =>
            d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "…";
          return (
            <span className="text-[10px] font-bold text-slate-500">
              {fmt(start_date)} → {fmt(end_date)}
            </span>
          );
        },
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
        header: "Logged",
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
          <div className="flex gap-2 md:gap-4">
            <button
              className="hover:bg-emerald-200 rounded p-0.5 cursor-pointer"
              onClick={() => openView(row.original.id)}
              aria-label="View Reminder"
            >
              👁️
            </button>
            <button
              className="hover:bg-amber-100 rounded p-0.5 cursor-pointer"
              onClick={() => toast.info("Nudge queued via Notifications campaign builder.")}
              aria-label="Nudge user"
            >
              🔔
            </button>
          </div>
        ),
      },
    ],
    [openView, isSuperAdmin],
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Privacy notice (mockup) */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500 font-medium">
        <span>🔒</span>
        <span>
          User identifiers are <strong>partially masked</strong>. Full IDs are visible to
          Super Admin and Data Officers only. Reminders are cross-referenced with{" "}
          <strong>Medication Enquiry</strong> for pharmacy availability.
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search by drug name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white outline-none"
          value={formFilter}
          onChange={(e) => {
            setFormFilter(e.target.value);
            setPageIndex(1);
          }}
        >
          <option value="">All Forms</option>
          {["tablet", "capsule", "syrup", "injection", "drops", "inhaler", "topical"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white outline-none"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPageIndex(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="complete">Completed</option>
          <option value="paused">Paused</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          📥 Export
        </button>
      </div>

      <div className="card p-0 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          selectable={false}
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

      {/* Bulk action bar (mockup footer) */}
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-auto">
          Bulk Actions
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => toast.info("Build a missed-dose nudge from the Notifications campaign builder.")}
        >
          🔔 Nudge Missed Doses
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setCampaignOpen(true)}>
          🏥 Pharmacy Marketing Campaign
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push("/notifications")}>
          📜 View Notification Log
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "adherence");
            window.history.pushState(null, "", `?${params.toString()}`);
            window.location.reload();
          }}
        >
          📋 Adherence Report
        </button>
      </div>

      <PharmacyCampaignModal open={campaignOpen} onOpenChange={setCampaignOpen} />
    </div>
  );
}
