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
} from "@/features/medication-reminder/data/useMedicationReminder";
import { useViewMediactionReminderDialog } from "@/features/medication-reminder/data/dialog-hooks";
import { usePermissionContext } from "@/stores/permission-context";
import { maskName } from "@/lib/masking";
import { toast } from "sonner";
import PharmacyCampaignModal from "./PharmacyCampaignModal";
import { downloadCsv } from "@/lib/csv";

const PAGE_SIZE = 10;

const splitDose = (dose?: string | null) => {
  const value = dose?.trim() ?? "";
  const match = value.match(/^([\d.,/+-]+)\s*(.*)$/);
  return {
    amount: match?.[1] || value || "—",
    unit: match?.[2] || "—",
  };
};

const formatDuration = (start?: string | null, end?: string | null) => {
  if (!end) return "Ongoing";
  if (!start) return new Date(end).toLocaleDateString();
  const days = Math.max(
    1,
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000),
  );
  return `${days} day${days === 1 ? "" : "s"}`;
};

const intakeLabel = (count?: number | null) => {
  if (count === 1) return "Once daily";
  if (count === 2) return "Twice daily";
  if (count === 3) return "Thrice daily";
  return count ? `${count} times daily` : null;
};

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

  const allRows = useMemo(() => data?.reminders || [], [data?.reminders]);
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
        user: r.user_profiles?.name,
        user_id: r.user_profiles?.public_id || r.user_profiles?.user_id,
        region: r.user_profiles?.region,
        generic_name: r.generic_name,
        conditions_treated: r.conditions_treated?.join(", "),
        drug_type: r.drug_type,
        dosage_amount: r.dosage_amount,
        interval: formatReminderInterval(r.interval, r.interval_unit),
        duration: formatDuration(r.start_date, r.end_date),
        adherence_rate: r.adherence_rate,
        status: getReminderStatus(r),
        logged_on: r.created_at ? new Date(r.created_at).toISOString() : null,
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
          return (
            <div className="min-w-[120px] font-bold text-slate-700 dark:text-slate-300">
              {isSuperAdmin ? name : maskName(name)}
            </div>
          );
        },
      },
      {
        id: "user_id",
        header: "User ID",
        cell: ({ row }) => {
          const userId =
            row.original.user_profiles?.public_id ||
            row.original.user_profiles?.user_id;
          if (!userId) return <span className="text-slate-400">—</span>;
          return (
            <span className="badge badge-slate whitespace-nowrap font-mono text-3xs">
              {isSuperAdmin
                ? row.original.user_profiles?.public_id || `4OL-${userId.slice(0, 6)}`
                : "4OL-••••••"}
            </span>
          );
        },
      },
      {
        id: "region",
        header: "Region",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
            {row.original.user_profiles?.region || "Not recorded"}
          </span>
        ),
      },
      {
        accessorKey: "drug_name",
        header: "Medication Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.drug_color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: row.original.drug_color }}
              />
            )}
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{row.original.drug_name}</div>
              <div className="text-2xs text-slate-400">
                {[row.original.strength, row.original.strength_unit, row.original.manufacturer]
                  .filter(Boolean)
                  .join(" · ") || "User-entered medication"}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "generic_name",
        header: "Generic / Brand",
        cell: ({ row }) => (
          <div className="min-w-[130px]">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {row.original.generic_name || "Not in catalogue"}
            </div>
            {row.original.manufacturer && (
              <div className="text-2xs text-slate-400">{row.original.manufacturer}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "conditions_treated",
        header: "Condition Treated",
        cell: ({ row }) => {
          const conditions = row.original.conditions_treated ?? [];
          return conditions.length > 0 ? (
            <div className="flex min-w-[130px] flex-wrap gap-1">
              {conditions.slice(0, 2).map((condition) => (
                <span key={condition} className="badge badge-green text-3xs">
                  {condition}
                </span>
              ))}
              {conditions.length > 2 && (
                <span className="badge badge-slate text-3xs">+{conditions.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400">Not recorded</span>
          );
        },
      },
      {
        id: "dose_amount",
        header: "Amount / Dose",
        cell: ({ row }) => (
          <span className="text-xs font-bold tabular-nums">
            {splitDose(row.original.dosage_amount).amount}
          </span>
        ),
      },
      {
        id: "dose_unit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="badge badge-indigo whitespace-nowrap">
            {splitDose(row.original.dosage_amount).unit}
          </span>
        ),
      },
      {
        accessorKey: "drug_type",
        header: "Type / Form",
        cell: ({ row }) => (
          <span className="badge badge-blue whitespace-nowrap capitalize">
            {row.original.dosage_form || row.original.drug_type || "Not recorded"}
          </span>
        ),
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {intakeLabel(row.original.number_of_intakes) ||
                row.original.notification_schedule ||
                formatReminderInterval(row.original.interval, row.original.interval_unit)}
            </div>
            <div className="text-2xs text-slate-400">
              {formatReminderInterval(row.original.interval, row.original.interval_unit)}
            </div>
          </div>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => {
          return (
            <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
              {formatDuration(row.original.start_date, row.original.end_date)}
            </span>
          );
        },
      },
      {
        accessorKey: "adherence_rate",
        header: "Adherence",
        cell: ({ row }) => {
          const rate = row.original.adherence_rate;
          if (rate == null) {
            return <span className="text-xs text-slate-400">No logs</span>;
          }
          return (
            <div>
              <span
                className={cn(
                  "text-xs font-black tabular-nums",
                  rate >= 80
                    ? "text-emerald-600"
                    : rate >= 65
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {rate}%
              </span>
              <div className="text-3xs text-slate-400">
                {row.original.adherence_total?.toLocaleString()} logged doses
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "is_enabled",
        header: "Status",
        cell: ({ row }) => {
          const status = getReminderStatus(row.original);
          if (status !== "complete" && (row.original.missed_count ?? 0) > 0) {
            return <span className="badge badge-red">⚠ Missed dose</span>;
          }
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
        id: "pharmacy_notification",
        header: "Pharmacy Notif.",
        cell: () => (
          <span
            className="badge badge-slate whitespace-nowrap text-3xs"
            title="The current schema does not store pharmacy campaign delivery per reminder."
          >
            Not tracked
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Logged",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-400">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString()
              : "—"}
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
              className="hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded p-0.5 cursor-pointer"
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
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-xs text-slate-500 font-medium">
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
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
          placeholder="🔍 Search by drug name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
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
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
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

      <div className="card p-0 overflow-x-auto border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
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
      <div className="flex flex-wrap gap-2 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
        <span className="text-2xs font-black uppercase tracking-widest text-slate-400 mr-auto">
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
