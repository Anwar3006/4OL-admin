"use client";

import React, { useState, useCallback, useMemo } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  useAdminConversations,
  useDeleteConversation,
} from "@/hooks/supabase-calls/useConversation";
import { useViewGroupDialog, useAddGroupDialog } from "@/stores/dialog-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const addGroupDialog = useAddGroupDialog();
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

  const handleView = useCallback((row: GroupRow) => {
    viewGroupDialog.open(row.id, row);
  }, [viewGroupDialog]);

  const handleEdit = useCallback((row: GroupRow) => {
    addGroupDialog.open(row);
  }, [addGroupDialog]);

  const handleDelete = useCallback((row: GroupRow) => {
    deleteMutation.mutate(row.id);
  }, [deleteMutation]);

  const creatorName = useCallback((row: GroupRow) =>
    row.user_profiles
      ? `${row.user_profiles.first_name || ""} ${row.user_profiles.last_name || ""}`.trim()
      : "—", []);

  const columns = useMemo<ColumnDef<GroupRow>[]>(
    () => [
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-800">{row.original.name}</div>
          <div className="text-[10px] text-slate-400 line-clamp-1">
            {row.original.description || "No description"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "member_count",
      header: "Members",
      cell: ({ row }) => <span className="font-black">{row.original.member_count}</span>,
    },
    {
      accessorKey: "user_profiles",
      header: "Group Admin / Creator",
      cell: ({ row }) => (
        <div className="text-[11px] font-bold text-slate-700">
          {creatorName(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "last_message",
      header: "Last Message",
      cell: ({ row }) => {
        const val = row.original.last_message;
        return (
          <div className="max-w-[180px]">
            <span className="text-[10px] text-slate-500 line-clamp-1">
              {val?.content || "—"}
            </span>
            {val?.sender && (
              <span className="text-[9px] text-slate-400 block">
                by{" "}
                {`${val.sender.first_name || ""} ${val.sender.last_name || ""}`.trim() || "Unknown"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-[10px] text-slate-400">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(row.original)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-ek-green/10 hover:text-ek-green-dark transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="View"
            aria-label="View Group"
          >
            👁️
          </button>
          <button
            onClick={() => handleEdit(row.original)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="Edit"
            aria-label="Edit Group"
          >
            ✏️
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
                title="Delete"
                aria-label="Delete Group"
              >
                🗑️
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{row.original.name || "this group"}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(row.original)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
    ],
    [creatorName, handleDelete, handleEdit, handleView],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
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
        <button
          className="btn btn-primary btn-sm text-white"
          onClick={() => addGroupDialog.open()}
        >
          + Create Group
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={groups}
          isLoading={isLoading}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: groups.length,
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
