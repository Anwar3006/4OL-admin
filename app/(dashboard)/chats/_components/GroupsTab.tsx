"use client";

import React, { useState, useCallback } from "react";
import DataTable, { Column } from "@/components/redesign/DataTable";
import {
  useAdminConversations,
  useDeleteConversation,
} from "@/hooks/supabase-calls/useConversation";
import { useViewGroupDialog, useEditGroupDialog } from "@/stores/dialog-store";

export interface GroupRow {
  id: string;
  name: string;
  description: string;
  member_count: number;
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
  status: string;
}

export default function GroupsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const viewGroupDialog = useViewGroupDialog();
  const editGroupDialog = useEditGroupDialog();
  const deleteMutation = useDeleteConversation();

  const { data, isLoading } = useAdminConversations({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  const groups = (data?.conversations || []) as GroupRow[];
  const totalPages = data?.meta?.totalPages ?? 1;

  // Debounce search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearch(val);
      const timer = setTimeout(() => {
        setDebouncedSearch(val);
        setPage(1);
      }, 400);
      return () => clearTimeout(timer);
    },
    [],
  );

  const handleView = (row: GroupRow) => {
    viewGroupDialog.open(row.id, row);
  };

  const handleEdit = (row: GroupRow) => {
    editGroupDialog.open(row);
  };

  const handleDelete = (row: GroupRow) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${row.name || "this group"}"?`,
      )
    ) {
      deleteMutation.mutate(row.id);
    }
  };

  const creatorName = (row: GroupRow) =>
    row.user_profiles
      ? `${row.user_profiles.first_name || ""} ${row.user_profiles.last_name || ""}`.trim()
      : "—";

  const columns: Column<GroupRow>[] = [
    {
      key: "name",
      label: "Group Name",
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400 line-clamp-1">
            {row.description || "No description"}
          </div>
        </div>
      ),
    },
    {
      key: "member_count",
      label: "Members",
      render: (val) => <span className="font-black">{val}</span>,
    },
    {
      key: "user_profiles",
      label: "Group Admin / Creator",
      render: (_, row) => (
        <div className="text-[11px] font-bold text-slate-700">
          {creatorName(row)}
        </div>
      ),
    },
    {
      key: "last_message",
      label: "Last Message",
      render: (val) => (
        <div className="max-w-[180px]">
          <span className="text-[10px] text-slate-500 line-clamp-1">
            {val?.content || "—"}
          </span>
          {val?.sender && (
            <span className="text-[9px] text-slate-400 block">
              by{" "}
              {`${val.sender.first_name || ""} ${val.sender.last_name || ""}`.trim() ||
                "Unknown"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (val) => (
        <span className="text-[10px] text-slate-400">
          {val ? new Date(val).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions" as any,
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(row)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-ek-green/10 hover:text-ek-green-dark transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="View"
          >
            👁️
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      {/* <div className="alert bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex items-center gap-3">
        <span className="text-base">🔍</span>
        <div className="flex-1 text-[11px] font-medium">
          <strong className="font-black">Super Admin:</strong> Global Message
          Search — Search across all {data?.meta?.total || 0} group histories.
        </div>
        <div className="flex gap-2">
          <input
            className="h-7 px-2 rounded-lg border border-blue-200 text-[11px] w-48 outline-none"
            placeholder="Search all messages..."
          />
          <button className="btn btn-primary btn-sm h-7 text-white text-[10px]">
            Search
          </button>
        </div>
      </div> */}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search groups by name, category, admin..."
          value={search}
          onChange={handleSearchChange}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option>All Status</option>
        </select>
        <button className="btn btn-primary btn-sm text-white">
          + Create Group
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={groups}
          selectable
          pagination
          itemsPerPage={10}
          externalTotalPages={totalPages}
          externalPage={page}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
