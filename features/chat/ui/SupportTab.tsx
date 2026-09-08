"use client";

import React, { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useChats } from "@/features/chat/data/useChat";
import {
  useUpdateSupportTicket,
  useDeleteSupportTicket,
} from "@/features/chat/data/useConversation";
import { useUsers } from "@/features/users/data/useUser";
import { useSupportAnalytics } from "@/features/chat/data/useConversation";
import { useAddTicketDialog } from "@/features/chat/data/dialog-hooks";
import { useHasPermission } from "@/stores/permission-context";
import { TChatOutput } from "@/features/chat/schema/chat";
import {
  SUPPORT_STATUSES,
  SUPPORT_STATUS_BADGES,
  SUPPORT_TYPES,
  ticketDisplayId,
} from "@/features/chat/schema/constants";
import { downloadCsv } from "@/lib/csv";
import AddTicketDialog from "./add-ticket-dialog";

const PRIORITY_BADGE: Record<string, string> = {
  Low: "badge-blue",
  Medium: "badge-amber",
  High: "badge-red",
};

const WAIT_THRESHOLD_MINUTES = 30;

function waitMinutes(ticket: TChatOutput): number | null {
  if (ticket.status === "Resolved" || !ticket.created_at) return null;
  return Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / 60000);
}

function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / (60 * 24))}d`;
}

// Support tab rebuild (Gap Analysis Part E, phase 3): TKT ids, 5-status
// triage, assign/escalate/resolve via server routes, wait-time styling,
// Agent Load panel and bulk actions.
export default function SupportTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [assignTarget, setAssignTarget] = useState<{ ids: (number | string)[] } | null>(null);
  const [assigneeId, setAssigneeId] = useState("");

  const { data, isLoading, isFetching } = useChats({ page, limit: 10 });
  const { data: analytics } = useSupportAnalytics("30");
  const updateTicket = useUpdateSupportTicket();
  const deleteTicket = useDeleteSupportTicket();
  const addTicket = useAddTicketDialog();
  const { data: adminsData } = useUsers({ admin: true, page: 1, limit: 100 });
  const canModerate = useHasPermission("chats.moderate");

  const admins = (adminsData?.users ?? []) as Array<{
    user_id: string;
    name?: string;
    email?: string;
  }>;
  const agentName = useCallback(
    (id: string | null | undefined) => {
      if (!id) return null;
      const agent = admins.find((a) => a.user_id === id);
      return agent?.name || agent?.email || "Unknown";
    },
    [admins],
  );

  const tickets = data?.chats || [];

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    if (typeFilter !== "all" && (ticket.category || "Other") !== typeFilter) return false;
    if (agentFilter === "unassigned" && ticket.assigned_to) return false;
    if (agentFilter !== "all" && agentFilter !== "unassigned" && ticket.assigned_to !== agentFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      const requester =
        `${ticket.user_profiles?.first_name ?? ""} ${ticket.user_profiles?.last_name ?? ""}`.toLowerCase();
      if (
        !ticket.subject?.toLowerCase().includes(q) &&
        !ticket.message?.toLowerCase().includes(q) &&
        !requester.includes(q) &&
        !ticketDisplayId(ticket.id).toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Agent Load panel — open-ticket counts per agent + unassigned urgent.
  const agentLoad = useMemo(() => {
    const open = tickets.filter((t) => t.status !== "Resolved");
    const byAgent = new Map<string, number>();
    let unassignedUrgent = 0;
    for (const t of open) {
      if (!t.assigned_to) {
        if (t.priority === "High" || (waitMinutes(t) ?? 0) > WAIT_THRESHOLD_MINUTES) {
          unassignedUrgent += 1;
        }
        continue;
      }
      byAgent.set(t.assigned_to, (byAgent.get(t.assigned_to) ?? 0) + 1);
    }
    return { byAgent, unassignedUrgent, openCount: open.length };
  }, [tickets]);

  const handleView = useCallback((row: TChatOutput) => addTicket.open(row), [addTicket]);

  const handleAssign = (ids: (number | string)[]) => {
    setAssignTarget({ ids });
    setAssigneeId("");
  };

  const confirmAssign = async () => {
    if (!assignTarget || !assigneeId) return;
    await Promise.all(
      assignTarget.ids.map((id) =>
        updateTicket.mutateAsync({ id, assignedTo: assigneeId }),
      ),
    );
    setAssignTarget(null);
  };

  const bulkStatus = async (ids: (number | string)[], status: "Escalated" | "Resolved") => {
    await Promise.all(ids.map((id) => updateTicket.mutateAsync({ id, status })));
  };

  const handleExport = () => {
    downloadCsv(
      filteredTickets.map((t) => ({
        Ticket: ticketDisplayId(t.id),
        Subject: t.subject || "",
        Requester:
          [t.user_profiles?.first_name, t.user_profiles?.last_name]
            .filter(Boolean)
            .join(" ") || "",
        Type: t.category || "Other",
        Priority: t.priority,
        Status: t.status,
        Agent: agentName(t.assigned_to) || "Unassigned",
        Created: t.created_at?.slice(0, 10) ?? "",
      })),
      "support-tickets",
    );
  };

  const totalPages = data?.meta?.totalPages || 1;
  const totalItems = data?.meta?.total || 0;
  const unassignedWaiting = analytics?.support?.unassigned ?? 0;

  const columns = useMemo<ColumnDef<TChatOutput>[]>(
    () => [
      {
        id: "ticket",
        header: "Ticket",
        cell: ({ row }) => (
          <div>
            <div className="font-black text-slate-800 dark:text-slate-200 font-mono text-xs">
              {ticketDisplayId(row.original.id)}
            </div>
            <div className="text-2xs text-slate-500 line-clamp-1">
              {row.original.subject || "No subject"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "user_profiles",
        header: "User",
        cell: ({ row }) => {
          const val = row.original.user_profiles;
          return (
            <div className="text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300">
                {val ? `${val.first_name ?? ""} ${val.last_name ?? ""}`.trim() : "Unknown"}
              </div>
              <div className="text-slate-400">{val?.phone_number || "—"}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "message",
        header: "Topic / Summary",
        cell: ({ row }) => (
          <div className="text-xs text-slate-500 max-w-[200px] truncate">
            {row.original.message || "—"}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {row.original.category || "Other"}
          </span>
        ),
      },
      {
        id: "wait",
        header: "Wait Time",
        cell: ({ row }) => {
          const minutes = waitMinutes(row.original);
          if (minutes === null) {
            return <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-bold">Resolved</span>;
          }
          const urgent = minutes > WAIT_THRESHOLD_MINUTES;
          return (
            <span
              className={`text-2xs font-black px-1.5 py-0.5 rounded-md ${
                urgent ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15" : "text-slate-500"
              }`}
            >
              {urgent ? "⚠ " : ""}
              {formatWait(minutes)}
            </span>
          );
        },
      },
      {
        accessorKey: "assigned_to",
        header: "Agent",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-600 dark:text-slate-300">
            {agentName(row.original.assigned_to) ?? (
              <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span className={`badge ${PRIORITY_BADGE[row.original.priority] || "badge-slate"}`}>
            {row.original.priority}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className={`badge ${SUPPORT_STATUS_BADGES[row.original.status] || "badge-slate"}`}>
            {row.original.status}
          </span>
        ),
      },
    ],
    [agentName],
  );

  const rowActions = useMemo(
    () => [
      { label: "👁️ Open", onClick: (row: TChatOutput) => handleView(row) },
      ...(canModerate
        ? [
            {
              label: "👤 Assign…",
              onClick: (row: TChatOutput) => handleAssign([row.id]),
            },
            {
              label: "🔺 Escalate",
              onClick: (row: TChatOutput) =>
                updateTicket.mutate({ id: row.id, status: "Escalated" }),
            },
            {
              label: "✅ Mark Resolved",
              onClick: (row: TChatOutput) =>
                updateTicket.mutate({ id: row.id, status: "Resolved" }),
            },
            {
              label: "🗑️ Delete",
              danger: true,
              onClick: (row: TChatOutput) => {
                if (
                  globalThis.confirm(
                    `Delete ${ticketDisplayId(row.id)} (${row.subject || "no subject"})? This cannot be undone.`,
                  )
                ) {
                  deleteTicket.mutate({ id: row.id });
                }
              },
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canModerate, handleView, updateTicket, deleteTicket],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* Unread / unassigned alert banner */}
      {unassignedWaiting > 0 && (
        <div className="alert al-ic">
          ⚠️ {unassignedWaiting} unassigned ticket{unassignedWaiting !== 1 ? "s" : ""} waiting —
          triage promptly to keep response times under the 5m target.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search by TKT id, subject, requester..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {SUPPORT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
        >
          <option value="all">All Agents</option>
          <option value="unassigned">Unassigned</option>
          {admins.map((a) => (
            <option key={a.user_id} value={a.user_id}>{a.name || a.email}</option>
          ))}
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          {SUPPORT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-secondary btn-sm font-bold" onClick={handleExport}>
          📥 Export
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="card p-0 overflow-hidden min-w-0">
          <DataTable
            columns={columns}
            data={filteredTickets}
            isLoading={isLoading || isFetching}
            selectable={canModerate}
            rowActions={rowActions}
            onRowClick={(row: TChatOutput) => handleView(row)}
            bulkActions={
              canModerate
                ? [
                    {
                      label: "👤 Bulk Assign",
                      onClick: (rows: TChatOutput[]) => handleAssign(rows.map((r) => r.id)),
                    },
                    {
                      label: "🔺 Escalate Selected",
                      onClick: (rows: TChatOutput[]) =>
                        bulkStatus(rows.map((r) => r.id), "Escalated"),
                    },
                    {
                      label: "✅ Mark Resolved",
                      onClick: (rows: TChatOutput[]) =>
                        bulkStatus(rows.map((r) => r.id), "Resolved"),
                    },
                  ]
                : undefined
            }
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

        {/* Agent Load side panel */}
        <div className="card space-y-3">
          <h3 className="card-title text-sm">🧑‍💼 Agent Load</h3>
          <div className="alert al-ic text-2xs">
            {agentLoad.openCount} open ticket{agentLoad.openCount !== 1 ? "s" : ""} ·{" "}
            <strong>{agentLoad.unassignedUrgent}</strong> unassigned urgent
          </div>
          <div className="space-y-1.5">
            {admins.map((a) => {
              const load = agentLoad.byAgent.get(a.user_id) ?? 0;
              return (
                <div
                  key={a.user_id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {a.name || a.email}
                  </span>
                  <span
                    className={`badge text-3xs ${load > 3 ? "badge-red" : load > 0 ? "badge-blue" : "badge-slate"}`}
                  >
                    {load} open
                  </span>
                </div>
              );
            })}
            {admins.length === 0 && (
              <p className="text-2xs text-slate-400 italic">No agents found</p>
            )}
          </div>
        </div>
      </div>

      {/* Assign dialog (single + bulk) */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
              Assign {assignTarget.ids.length} ticket
              {assignTarget.ids.length !== 1 ? "s" : ""}
            </h3>
            <select
              className="h-9 w-full px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-800"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Select agent…</option>
              {admins.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.name || a.email}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAssignTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm text-white"
                disabled={!assigneeId || updateTicket.isPending}
                onClick={confirmAssign}
              >
                {updateTicket.isPending ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddTicketDialog />
    </div>
  );
}
