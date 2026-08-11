"use client";

import React, { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  useFlaggedContent,
  useModerateContent,
  FlaggedContentItem,
} from "@/hooks/supabase-calls/useConversation";

const ACTION_STYLES: Record<string, string> = {
  dismiss:
    "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
  remove: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
  ban: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200",
};

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-800",
  dismissed: "bg-slate-100 text-slate-600",
  actioned: "bg-red-100 text-red-800",
};

export default function FlaggedTab() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionModal, setActionModal] = useState<{
    item: FlaggedContentItem;
    action: "dismiss" | "warn" | "remove" | "ban";
  } | null>(null);
  const [notes, setNotes] = useState("");

  const { data: flaggedItems, isLoading } = useFlaggedContent();
  const moderateMutation = useModerateContent();

  const filtered = (flaggedItems || []).filter((item) => {
    if (filterType !== "all" && item.content_type !== filterType) return false;
    if (
      filterStatus === "pending" &&
      item.moderation_status !== "pending_review"
    )
      return false;
    if (filterStatus === "actioned" && item.moderation_status !== "actioned")
      return false;
    if (filterStatus === "dismissed" && item.moderation_status !== "dismissed")
      return false;
    return true;
  });

  const handleModerate = useCallback(
    (
      item: FlaggedContentItem,
      action: "dismiss" | "warn" | "remove" | "ban",
    ) => {
      if (action === "dismiss") {
        // Immediate dismiss without modal
        moderateMutation.mutate({
          flag_id: item.flag_id,
          action,
          action_notes: "",
        });
      } else {
        setActionModal({ item, action });
        setNotes("");
      }
    },
    [moderateMutation],
  );

  const confirmModeration = () => {
    if (!actionModal) return;
    moderateMutation.mutate({
      flag_id: actionModal.item.flag_id,
      action: actionModal.action,
      action_notes: notes || undefined,
    });
    setActionModal(null);
    setNotes("");
  };

  const columns = useMemo<ColumnDef<FlaggedContentItem>[]>(
    () => [
    {
      accessorKey: "content_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase">
          {row.original.content_type === "message" ? "💬 Msg" : "👥 Group"}
        </span>
      ),
    },
    {
      accessorKey: "content_preview",
      header: "Content Preview",
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <div className="text-[11px] font-bold text-slate-800 line-clamp-2">
            {row.original.content_preview || "—"}
          </div>
          {row.original.conversation_name && (
            <div className="text-[9px] text-slate-400 mt-0.5">
              in {row.original.conversation_name}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "sender_first_name",
      header: "Sender",
      cell: ({ row }) => (
        <div className="text-[11px] font-bold text-slate-700">
          {[row.original.sender_first_name, row.original.sender_last_name]
            .filter(Boolean)
            .join(" ") || "—"}
        </div>
      ),
    },
    {
      accessorKey: "report_reason",
      header: "Flag Reason",
      cell: ({ row }) => (
        <div>
          <span className="text-[10px] font-bold text-slate-700 capitalize">
            {row.original.report_reason}
          </span>
          {row.original.ai_detected && (
            <span className="ml-1.5 px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[8px] font-black">
              AI
            </span>
          )}
          {row.original.report_detail && (
            <div className="text-[9px] text-slate-400 line-clamp-1">
              {row.original.report_detail}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "reporter_first_name",
      header: "Reported By",
      cell: ({ row }) => (
        <div className="text-[10px] text-slate-500">
          {[row.original.reporter_first_name, row.original.reporter_last_name]
            .filter(Boolean)
            .join(" ") || "System"}
        </div>
      ),
    },
    {
      accessorKey: "moderation_status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.original.moderation_status;
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
              STATUS_BADGE[val] || "bg-slate-100 text-slate-600"
            }`}
          >
            {val === "pending_review" ? "Pending" : val}
          </span>
        );
      },
    },
    {
      accessorKey: "flagged_at",
      header: "Flagged",
      cell: ({ row }) => (
        <span className="text-[10px] text-slate-400">
          {row.original.flagged_at
            ? new Date(row.original.flagged_at).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleModerate(item, "dismiss")}
              disabled={item.moderation_status !== "pending_review"}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title="Dismiss"
            >
              ✅
            </button>
            <button
              onClick={() => handleModerate(item, "warn")}
              disabled={item.moderation_status !== "pending_review"}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title="Warn"
            >
              ⚠️
            </button>
            <button
              onClick={() => handleModerate(item, "remove")}
              disabled={item.moderation_status !== "pending_review"}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title="Remove"
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [handleModerate],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Types</option>
          <option value="message">Messages</option>
          <option value="conversation">Conversations</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="actioned">Actioned</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <span className="text-[10px] text-slate-400 font-medium ml-auto">
          {filtered.length} flagged item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          pagination={true}
          isLoading={isLoading}
        />
      </div>

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="card py-20 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center mx-auto text-2xl">
              🎉
            </div>
            <h3 className="text-lg font-black text-slate-800">All Clear</h3>
            <p className="text-xs text-slate-500 font-medium">
              No flagged content requiring moderation at this time.
            </p>
          </div>
        </div>
      )}

      {/* Moderation Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 capitalize">
                  {actionModal.action} Content
                </h3>
                <p className="text-[10px] text-slate-400">
                  {actionModal.action === "warn"
                    ? "Issue a warning to the sender"
                    : actionModal.action === "remove"
                      ? "Remove this content permanently"
                      : "Ban the sender from the platform"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600">
              <div className="font-bold text-slate-800 mb-1">
                Content Preview:
              </div>
              <div className="line-clamp-3">
                {actionModal.item.content_preview}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Moderator Notes
              </label>
              <textarea
                className="w-full h-20 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none resize-none"
                placeholder="Optional notes about this moderation action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={confirmModeration}
                disabled={moderateMutation.isPending}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-colors cursor-pointer border-0 ${
                  actionModal.action === "warn"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : actionModal.action === "remove"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-rose-500 hover:bg-rose-600"
                } disabled:opacity-50`}
              >
                {moderateMutation.isPending
                  ? "Processing..."
                  : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
