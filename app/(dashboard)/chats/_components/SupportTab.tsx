"use client";

import React, { useState } from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useChats, useDeleteChat } from "@/hooks/supabase-calls/useChat";
import { useAddChatDialog } from "@/stores/dialog-store";
import { TChatOutput } from "@/schemas/chat.schema";
import AddChatDialog from "./add-chat-dialog";

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
  const { mutate: deleteChat } = useDeleteChat();
  const addChat = useAddChatDialog();

  const filteredChats = (data?.chats || []).filter((chat) => {
    if (statusFilter !== "all" && chat.status !== statusFilter) return false;
    if (priorityFilter !== "all" && chat.priority !== priorityFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      const requester =
        `${chat.user_profiles?.first_name ?? ""} ${chat.user_profiles?.last_name ?? ""}`.toLowerCase();
      if (
        !chat.subject?.toLowerCase().includes(q) &&
        !chat.message?.toLowerCase().includes(q) &&
        !requester.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const columns: Column<TChatOutput>[] = [
    {
      key: "subject",
      label: "Ticket",
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-800">{val || "No subject"}</div>
          <div className="text-[10px] text-slate-400">#{row.id}</div>
        </div>
      ),
    },
    {
      key: "user_profiles",
      label: "Requested By",
      render: (val: TChatOutput["user_profiles"]) => (
        <div className="text-[11px]">
          <div className="font-bold text-slate-700">
            {val ? `${val.first_name ?? ""} ${val.last_name ?? ""}`.trim() : "Unknown"}
          </div>
          <div className="text-slate-400">{val?.phone_number || "—"}</div>
        </div>
      ),
    },
    {
      key: "message",
      label: "Message",
      render: (val) => (
        <div className="text-[11px] text-slate-500 max-w-[220px] truncate">
          {val || "—"}
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (val) => (
        <span className={`badge ${PRIORITY_BADGE[val] || "badge-gray"}`}>
          {val}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`badge ${STATUS_BADGE[val] || "badge-gray"}`}>
          {val}
        </span>
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
  ];

  const rowActions: RowAction<TChatOutput>[] = [
    {
      label: "View / Edit",
      icon: <Eye className="w-4 h-4" />,
      onClick: (row) => addChat.open(row),
    },
    {
      label: "Mark Closed",
      icon: <Pencil className="w-4 h-4" />,
      onClick: (row) =>
        addChat.open({ ...row, status: row.status === "Open" ? "Closed" : "Open" }),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: (row) => {
        if (
          globalThis.confirm(
            `Delete ticket #${row.id} (${row.subject || "no subject"})? This cannot be undone.`,
          )
        ) {
          deleteChat(row.id);
        }
      },
      danger: true,
    },
  ];

  return (
    <div className="space-y-4 mt-4">
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
          data={filteredChats}
          rowActions={rowActions}
          isLoading={isLoading || isFetching}
          externalTotalPages={data?.meta.totalPages}
          externalPage={page}
          onPageChange={setPage}
        />
      </div>

      <AddChatDialog />
    </div>
  );
}
