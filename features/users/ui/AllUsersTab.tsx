"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { usePagination } from "@/hooks/use-pagination";
import { useViewUserDialog } from "@/features/users/data/dialog-hooks";
import { useHasPermission } from "@/stores/permission-context";
import {
  AdminUserRow,
  useAdminUsers,
  useUpdateUserStatus,
} from "@/features/users/data/useAdminUsers";
import { useRouter } from "next/navigation";
import BulkUserActionsDialog from "./BulkUserActionsDialog";

// ── Display helpers ─────────────────────────────────────────────────────────

const PLAN_BADGES: Record<string, string> = {
  free: "badge badge-slate",
  standard: "badge badge-blue",
  premium: "badge badge-purple",
  featured: "badge badge-amber",
};

const STATUS_BADGES: Record<string, string> = {
  active: "badge badge-green",
  inactive: "badge badge-slate",
  suspended: "badge badge-amber",
  banned: "badge badge-red",
};

const displayName = (row: AdminUserRow) =>
  row.full_name ||
  `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
  "Unknown User";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const relativeTime = (value: string | null) => {
  if (!value) return "Never";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

const selectClass =
  "h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20";

export default function AllUsersTab() {
  const router = useRouter();
  const viewDialog = useViewUserDialog();
  const canEdit = useHasPermission("users.edit");
  const { page, pageSize, onPageChange, onNextPage, onPreviousPage } =
    usePagination({ key: "users_page" });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [nhis, setNhis] = useState<"" | "linked" | "unlinked">("");
  const [sort, setSort] = useState<"" | "newest" | "oldest" | "last_active">("");
  const [bulkRows, setBulkRows] = useState<AdminUserRow[]>([]);
  const updateStatus = useUpdateUserStatus();

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useAdminUsers({
    search: search || undefined,
    plan: plan || undefined,
    status: status || undefined,
    nhis: nhis || undefined,
    sort: sort || undefined,
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
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const user = row.original;
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {displayName(user)}
                </span>
                {user.public_id && (
                  <span className="text-3xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/30">
                    {user.public_id}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">{user.email ?? "—"}</span>
            </div>
          );
        },
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {row.original.phone_number ?? "—"}
          </span>
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
        id: "nhis",
        header: "NHIS",
        cell: ({ row }: { row: { original: AdminUserRow } }) =>
          row.original.nhis_linked ? (
            <span className="badge badge-green">✓ {row.original.nhis_number}</span>
          ) : (
            <span className="text-xs text-slate-400">Not linked</span>
          ),
      },
      {
        id: "region",
        header: "Region",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-slate-600 dark:text-slate-300">{row.original.region ?? "—"}</span>
        ),
      },
      {
        id: "engagement",
        header: "Engagement",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${row.original.engagement_score}%` }}
              />
            </div>
            <span className="text-2xs font-bold text-slate-500">
              {row.original.engagement_score}%
            </span>
          </div>
        ),
      },
      {
        id: "joined",
        header: "Joined",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-slate-500">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "last_active",
        header: "Last Active",
        cell: ({ row }: { row: { original: AdminUserRow } }) => (
          <span className="text-xs text-slate-500">{relativeTime(row.original.last_active)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: AdminUserRow } }) => {
          const value = row.original.status ?? "active";
          return (
            <span className={STATUS_BADGES[value] ?? "badge badge-slate"}>{value}</span>
          );
        },
      },
    ],
    [],
  );

  const rowActions = useMemo(() => {
    const actions: { label: string; onClick: (row: AdminUserRow) => void; danger?: boolean }[] = [
      { label: "View Profile", onClick: (row) => viewDialog.open(row.user_id) },
      { label: "Send Message", onClick: () => router.push("/chats") },
    ];
    if (canEdit) {
      actions.push({
        label: "Change Plan",
        onClick: (row) => setBulkRows([row]),
      });
      actions.push({
        label: "Suspend",
        danger: true,
        onClick: (row) =>
          updateStatus.mutate({ userId: row.user_id, status: "suspended" }),
      });
    }
    return actions;
  }, [canEdit, router, updateStatus, viewDialog]);

  const cardConfig: MobileCardConfig<AdminUserRow> = {
    header: {
      title: (data) => displayName(data),
      subtitle: (data) => data.email ?? "—",
      badge: (data) => (
        <span className={PLAN_BADGES[data.plan] ?? "badge badge-slate"}>{data.plan}</span>
      ),
    },
    fields: [
      { id: "phone", label: "Phone", render: (data) => data.phone_number ?? "—" },
      { id: "region", label: "Region", render: (data) => data.region ?? "—" },
      {
        id: "status",
        label: "Status",
        render: (data) => data.status ?? "active",
      },
    ],
    actions: [{ label: "View User", onClick: (data) => viewDialog.open(data.user_id) }],
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search name, email, phone, NHIS…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="featured">Featured</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select
          className={selectClass}
          value={nhis}
          onChange={(e) => setNhis(e.target.value as "" | "linked" | "unlinked")}
        >
          <option value="">NHIS: All</option>
          <option value="linked">NHIS Linked</option>
          <option value="unlinked">Not Linked</option>
        </select>
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value as "" | "newest" | "oldest" | "last_active")}
        >
          <option value="">Sort: Newest</option>
          <option value="oldest">Oldest</option>
          <option value="last_active">Last Active</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={canEdit}
          onRowClick={(row) => viewDialog.open(row.user_id)}
          onDeleteSelected={canEdit ? (rows) => setBulkRows(rows) : undefined}
          deleteLabel="Bulk Actions"
          rowActions={rowActions}
          cardConfig={cardConfig}
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

      <BulkUserActionsDialog rows={bulkRows} onClose={() => setBulkRows([])} />
    </div>
  );
}
