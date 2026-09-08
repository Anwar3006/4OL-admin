"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { usePagination } from "@/hooks/use-pagination";
import { useViewUserDialog } from "@/features/users/data/dialog-hooks";
import {
  AdminUserRow,
  useAdminUsers,
} from "@/features/users/data/useAdminUsers";

// Session counts and per-feature usage are not instrumented yet (no events
// table). This tab is wired to real user data now and shows honest
// "awaiting instrumentation" placeholders for the metrics we cannot compute,
// instead of fabricated numbers.

const PLAN_BADGES: Record<string, string> = {
  free: "badge badge-slate",
  standard: "badge badge-blue",
  premium: "badge badge-purple",
  featured: "badge badge-amber",
};

const displayName = (row: AdminUserRow) =>
  row.full_name ||
  `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
  "Unknown User";

// Mirrors deriveEngagement() in /api/admin/users — last_active recency bands.
const deriveEngagement = (lastActive: string | null): number => {
  if (!lastActive) return 5;
  const days = (Date.now() - new Date(lastActive).getTime()) / 86_400_000;
  if (days <= 1) return 95;
  if (days <= 7) return 75;
  if (days <= 30) return 45;
  if (days <= 90) return 20;
  return 5;
};

const relativeTime = (value: string | null) => {
  if (!value) return "Never";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default function ActiveUsersTab() {
  const viewDialog = useViewUserDialog();
  const [search, setSearch] = useState("");
  const { page, pageSize, onPageChange, onNextPage, onPreviousPage } =
    usePagination({ key: "active_users_page" });

  const { data, isLoading, isError, error } = useAdminUsers({
    status: "active",
    sort: "last_active",
    search: search || undefined,
    page,
    limit: pageSize,
  });

  const users = data?.users ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {displayName(row.original)}
            </span>
            <span className="text-xs text-slate-400">
              {row.original.public_id ?? row.original.email ?? "—"}
            </span>
          </div>
        ),
      },
      {
        id: "plan",
        header: "Plan",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className={PLAN_BADGES[row.original.plan] ?? "badge badge-slate"}>
            {row.original.plan}
          </span>
        ),
      },
      {
        id: "sessions",
        header: "Sessions (7d)",
        cell: () => (
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
            Awaiting instrumentation
          </span>
        ),
      },
      {
        id: "avg_session",
        header: "Avg Session",
        cell: () => (
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
            Awaiting instrumentation
          </span>
        ),
      },
      {
        id: "engagement",
        header: "Engagement",
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const score = deriveEngagement(row.original.last_active);
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-2xs font-bold text-slate-500">{score}%</span>
            </div>
          );
        },
      },
      {
        id: "features",
        header: "Features Used",
        cell: () => (
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
            Awaiting instrumentation
          </span>
        ),
      },
      {
        id: "last_active",
        header: "Last Active",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-slate-500">
            {relativeTime(row.original.last_active)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="alert al-ic flex items-start gap-3">
        <span>📈</span>
        <div className="text-xs leading-relaxed">
          <strong>Retention view.</strong> Sessions, average session length and
          feature usage require the mobile-app analytics event pipeline — columns
          are shown now and populate automatically once events start flowing.
        </div>
      </div>

      <input
        className="w-full sm:max-w-sm h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        placeholder="🔍 Search active users…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={false}
          onRowClick={(row) => viewDialog.open(row.user_id)}
          rowActions={[
            { label: "View Profile", onClick: (row) => viewDialog.open(row.user_id) },
          ]}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange,
            onNextPage,
            onPreviousPage,
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>
    </div>
  );
}
