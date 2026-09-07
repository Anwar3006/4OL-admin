"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  useAdminConversations,
  useDeleteConversation,
  useUpdateConversation,
  useGlobalMessageSearch,
} from "@/features/chat/data/useConversation";
import { useViewGroupDialog, useAddGroupDialog } from "@/features/chat/data/dialog-hooks";
import { useHasPermission, usePermissionContext } from "@/stores/permission-context";
import {
  GROUP_CATEGORIES,
  groupCategoryLabel,
  groupTypeLabel,
  groupPermissionSummary,
  type GroupPermissionKey,
} from "@/features/chat/schema/constants";
import { downloadCsv } from "@/lib/csv";

export interface GroupRow {
  id: string;
  name: string;
  description: string;
  member_count: number;
  messages_7d: number;
  msgs_per_member: number;
  group_category: string | null;
  group_type: string | null;
  group_permissions: Partial<Record<GroupPermissionKey, boolean>> | null;
  status: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    phone_number: string;
  } | null;
  last_message: {
    content: string;
    created_at: string;
    sender: { first_name: string; last_name: string } | null;
  } | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: "badge-green",
  inactive: "badge-slate",
  archived: "badge-amber",
};

type SortMode = "newest" | "oldest" | "members" | "active";

export default function GroupsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [globalQuery, setGlobalQuery] = useState("");

  const viewGroupDialog = useViewGroupDialog();
  const addGroupDialog = useAddGroupDialog();
  const deleteMutation = useDeleteConversation();
  const updateMutation = useUpdateConversation();
  const globalSearch = useGlobalMessageSearch();

  const canModerate = useHasPermission("chats.moderate");
  // PHI: Global Message Search is super_admin only (decision E-D5).
  const { userRole } = usePermissionContext();
  const isSuperAdmin = userRole === "super_admin";

  const { data, isLoading } = useAdminConversations({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: statusFilter,
    category: categoryFilter || undefined,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const groups = useMemo(() => {
    const rows = [...((data?.conversations || []) as unknown as GroupRow[])];
    switch (sortMode) {
      case "oldest":
        rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "members":
        rows.sort((a, b) => b.member_count - a.member_count);
        break;
      case "active":
        rows.sort((a, b) => b.messages_7d - a.messages_7d);
        break;
      default:
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return rows;
  }, [data, sortMode]);

  const totalPages = data?.meta?.totalPages ?? 1;

  const handleView = useCallback((row: GroupRow) => {
    viewGroupDialog.open(row.id, row);
  }, [viewGroupDialog]);

  const handleEdit = useCallback((row: GroupRow) => {
    addGroupDialog.open(row);
  }, [addGroupDialog]);

  const handleDelete = useCallback((row: GroupRow) => {
    if (globalThis.confirm(`Delete "${row.name || "this group"}"? This cannot be undone.`)) {
      deleteMutation.mutate(row.id);
    }
  }, [deleteMutation]);

  const handleStatus = useCallback(
    (row: GroupRow, status: "active" | "inactive" | "archived") => {
      updateMutation.mutate({ id: row.id, status });
    },
    [updateMutation],
  );

  const creatorName = useCallback((row: GroupRow) =>
    row.user_profiles
      ? `${row.user_profiles.first_name || ""} ${row.user_profiles.last_name || ""}`.trim()
      : "—", []);

  const rowActions = useMemo(
    () => [
      { label: "👁️ View", onClick: (row: GroupRow) => handleView(row) },
      ...(canModerate
        ? [
            { label: "✏️ Edit", onClick: (row: GroupRow) => handleEdit(row) },
            {
              label: "▶️ Activate",
              onClick: (row: GroupRow) => handleStatus(row, "active"),
            },
            {
              label: "⏸️ Deactivate",
              onClick: (row: GroupRow) => handleStatus(row, "inactive"),
            },
            {
              label: "🗄 Archive",
              onClick: (row: GroupRow) => handleStatus(row, "archived"),
            },
            { label: "🗑️ Delete", onClick: (row: GroupRow) => handleDelete(row), danger: true },
          ]
        : []),
    ],
    [canModerate, handleDelete, handleEdit, handleStatus, handleView],
  );

  const handleExport = useCallback(() => {
    const rows = groups.map((g) => ({
      Group: g.name,
      Category: groupCategoryLabel(g.group_category),
      Type: groupTypeLabel(g.group_type),
      Members: g.member_count,
      "Messages (7d)": g.messages_7d,
      "Msgs/Member": g.msgs_per_member,
      Status: g.status ?? "active",
      Created: g.created_at?.slice(0, 10) ?? "",
    }));
    downloadCsv(rows, "groups");
  }, [groups]);

  const columns = useMemo<ColumnDef<GroupRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Group Name",
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-800">{row.original.name}</div>
            <div className="text-2xs text-slate-400 line-clamp-1">
              {row.original.description || "No description"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "group_category",
        header: "Category",
        cell: ({ row }) => (
          <span className="badge badge-blue text-3xs">
            {groupCategoryLabel(row.original.group_category)}
          </span>
        ),
      },
      {
        accessorKey: "member_count",
        header: "Members",
        cell: ({ row }) => <span className="font-black">{row.original.member_count}</span>,
      },
      {
        accessorKey: "user_profiles",
        header: "Group Admin / Permissions",
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-bold text-slate-700">{creatorName(row.original)}</div>
            <div className="text-3xs text-slate-400">
              {groupPermissionSummary(row.original.group_permissions, row.original.group_type)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "messages_7d",
        header: "Msgs (7d)",
        cell: ({ row }) => (
          <span className="font-black text-slate-600">{row.original.messages_7d ?? 0}</span>
        ),
      },
      {
        accessorKey: "msgs_per_member",
        header: "Msgs/Member",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-500">
            {row.original.msgs_per_member ?? 0}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status ?? "active";
          return (
            <span className={`badge ${STATUS_BADGE[status] || "badge-green"} text-3xs capitalize`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-2xs text-slate-400">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
    ],
    [creatorName],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* SA-only Global Message Search (Gap Analysis E-D5 — PHI) */}
      {isSuperAdmin && (
        <div className="alert bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base">🔍</span>
            <div className="flex-1 text-xs font-medium">
              <strong className="font-black">Super Admin:</strong> Global Message
              Search — search across all {data?.meta?.total || 0} group histories
              (audit/compliance). Every search is audit-logged.
            </div>
            <div className="flex gap-2">
              <input
                className="h-7 px-2 rounded-lg border border-blue-200 text-xs w-48 outline-none"
                placeholder="Search all messages..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalQuery.trim().length >= 2) {
                    globalSearch.mutate(globalQuery.trim());
                  }
                }}
              />
              <button
                className="btn btn-primary btn-sm h-7 text-white text-2xs"
                disabled={globalSearch.isPending || globalQuery.trim().length < 2}
                onClick={() => globalSearch.mutate(globalQuery.trim())}
              >
                {globalSearch.isPending ? "Searching…" : "Search"}
              </button>
            </div>
          </div>
          {globalSearch.data && (
            <div className="text-2xs space-y-1 max-h-40 overflow-y-auto border-t border-blue-100 pt-2">
              <div className="font-black">{globalSearch.data.total} result(s)</div>
              {globalSearch.data.results.map((r) => (
                <div key={r.id} className="bg-white/60 rounded-md px-2 py-1">
                  <span className="font-bold">{r.conversationName}</span> ·{" "}
                  {r.senderName} ·{" "}
                  <span className="text-blue-500">{new Date(r.createdAt).toLocaleString()}</span>
                  <div className="line-clamp-1 text-blue-900">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search groups by name, category, admin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {GROUP_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Archived</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="members">Sort: Most Members</option>
          <option value="active">Sort: Most Active (7d)</option>
        </select>
        <button className="btn btn-secondary btn-sm font-bold" onClick={handleExport}>
          📥 Export
        </button>
        {canModerate && (
          <button
            className="btn btn-primary btn-sm text-white"
            onClick={() => addGroupDialog.open()}
          >
            + Create Group
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={groups}
          isLoading={isLoading}
          selectable={canModerate}
          rowActions={rowActions}
          onRowClick={(row: GroupRow) => handleView(row)}
          onDeleteSelected={
            canModerate
              ? (rows: GroupRow[]) => {
                  if (
                    globalThis.confirm(
                      `Archive ${rows.length} selected group(s)? They will be hidden from members.`,
                    )
                  ) {
                    Promise.all(
                      rows.map((r) =>
                        updateMutation.mutateAsync({ id: r.id, status: "archived" }),
                      ),
                    );
                  }
                }
              : undefined
          }
          deleteLabel="🗄 Archive Selected"
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: data?.meta?.total ?? groups.length,
            pageSize: 10,
            onPageChange: setPage,
            onNextPage: () => setPage((p) => p + 1),
            onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>
    </div>
  );
}
