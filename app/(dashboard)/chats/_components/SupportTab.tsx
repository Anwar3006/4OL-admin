"use client";

import React, { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useChats, useDeleteChat } from "@/hooks/supabase-calls/useChat";
import { useAddTicketDialog } from "@/stores/dialog-store";
import { TChatOutput } from "@/schemas/chat.schema";
import AddTicketDialog from "./add-ticket-dialog";

const PRIORITY_BADGE: Record<string, string> = {
  Low: "badge-blue",
  Medium: "badge-amber",
  High: "badge-red",
};

const STATUS_BADGE: Record<string, string> = {
  Open: "badge-green",
  Closed: "badge-gray",
};

export default function SupportTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data, isLoading, isFetching } = useChats({ page, limit: 10 });
  const { mutate: deleteTicket } = useDeleteChat();
  const addTicket = useAddTicketDialog();

  const filteredTickets = (data?.chats || []).filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      const requester =
        `${ticket.user_profiles?.first_name ?? ""} ${ticket.user_profiles?.last_name ?? ""}`.toLowerCase();
      if (
        !ticket.subject?.toLowerCase().includes(q) &&
        !ticket.message?.toLowerCase().includes(q) &&
        !requester.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleView = useCallback(
    (row: TChatOutput) => addTicket.open(row),
    [addTicket],
  );

  const handleToggleStatus = useCallback(
    (row: TChatOutput) =>
    addTicket.open({
      ...row,
      status: row.status === "Open" ? "Closed" : "Open",
    }),
    [addTicket],
  );

  const handleDelete = useCallback((row: TChatOutput) => {
    if (
      globalThis.confirm(
        `Delete ticket #${row.id} (${row.subject || "no subject"})? This cannot be undone.`,
      )
    ) {
      deleteTicket(row.id);
    }
  }, [deleteTicket]);

  const totalPages = data?.meta?.totalPages || 1;
  const totalItems = data?.meta?.total || 0;

  const columns = useMemo<ColumnDef<TChatOutput>[]>(
    () => [
    {
      accessorKey: "subject",
      header: "Ticket",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-800">{row.original.subject || "No subject"}</div>
          <div className="text-[10px] text-slate-400">#{row.original.id}</div>
        </div>
      ),
    },
    {
      accessorKey: "user_profiles",
      header: "Requested By",
      cell: ({ row }) => {
        const val = row.original.user_profiles;
        return (
          <div className="text-[11px]">
            <div className="font-bold text-slate-700">
              {val ? `${val.first_name ?? ""} ${val.last_name ?? ""}`.trim() : "Unknown"}
            </div>
            <div className="text-slate-400">{val?.phone_number || "—"}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <div className="text-[11px] text-slate-500 max-w-[220px] truncate">
          {row.original.message || "—"}
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <span className={`badge ${PRIORITY_BADGE[row.original.priority] || "badge-gray"}`}>
          {row.original.priority}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`badge ${STATUS_BADGE[row.original.status] || "badge-gray"}`}>
          {row.original.status}
        </span>
      ),
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
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(row.original)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-ek-green/10 hover:text-ek-green-dark transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="View / Edit"
          >
            👁️
          </button>
          <button
            onClick={() => handleToggleStatus(row.original)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title={row.original.status === "Open" ? "Mark Closed" : "Reopen"}
          >
            {row.original.status === "Open" ? "✅" : "🔄"}
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      ),
    },
    ],
    [handleDelete, handleToggleStatus, handleView],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search tickets by subject, message, requester..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredTickets}
          isLoading={isLoading || isFetching}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            pageSize: 10,
            onPageChange: setPage,
            onNextPage: () => setPage((p) => p + 1),
            onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>

      <AddTicketDialog />
    </div>
  );
}
