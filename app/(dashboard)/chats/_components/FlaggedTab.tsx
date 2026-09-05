"use client";

import React, { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  useFlaggedContent,
  useModerateContent,
  FlaggedContentItem,
} from "@/hooks/supabase-calls/useConversation";
import { useHasPermission } from "@/stores/permission-context";
import { FLAG_REASONS } from "@/lib/chats-constants";
import { downloadCsv } from "@/lib/csv";

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-800",
  dismissed: "bg-slate-100 text-slate-600",
  actioned: "bg-red-100 text-red-800",
};

// Flagged tab completion (Gap Analysis Part E, phase 4): Ban action,
// Confidence column, Context dialog, reason/group/auto-manual filters.
// Moderation writes stay gated on chats.moderate (support_agent = view only).
export default function FlaggedTab() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReason, setFilterReason] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [actionModal, setActionModal] = useState<{
    item: FlaggedContentItem;
    action: "dismiss" | "warn" | "remove" | "ban";
  } | null>(null);
  const [contextItem, setContextItem] = useState<FlaggedContentItem | null>(null);
  const [notes, setNotes] = useState("");

  const { data: flaggedItems, isLoading } = useFlaggedContent();
  const moderateMutation = useModerateContent();
  const canModerate = useHasPermission("chats.moderate");

  const items = flaggedItems || [];

  // Alert banner — pending counts by reason.
  const reasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.moderation_status !== "pending_review") continue;
      counts.set(item.report_reason, (counts.get(item.report_reason) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => i.conversation_name).filter(Boolean)),
      ) as string[],
    [items],
  );

  const filtered = items.filter((item) => {
    if (filterType !== "all" && item.content_type !== filterType) return false;
    if (filterReason !== "all" && item.report_reason !== filterReason) return false;
    if (filterGroup !== "all" && item.conversation_name !== filterGroup) return false;
    if (filterSource === "auto" && !item.ai_detected) return false;
    if (filterSource === "manual" && item.ai_detected) return false;
    if (
      filterStatus === "pending" &&
      item.moderation_status !== "pending_review"
    )
      return false;
    if (filterStatus === "actioned" && item.moderation_status !== "actioned")
      return false;
    if (filterStatus === "dismissed" && item.moderation_status !== "dismissed")
      return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !item.content_preview?.toLowerCase().includes(q) &&
        !item.conversation_name?.toLowerCase().includes(q) &&
        ![item.sender_first_name, item.sender_last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
    }
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

  const handleExport = () => {
    downloadCsv(
      filtered.map((i) => ({
        Group: i.conversation_name ?? "",
        Sender:
          [i.sender_first_name, i.sender_last_name].filter(Boolean).join(" ") ||
          "",
        Message: i.content_preview ?? "",
        Reason: i.report_reason,
        "Confidence %": i.ai_confidence ?? "",
        Source: i.ai_detected ? "AI" : "Manual",
        "Flagged At": i.flagged_at?.slice(0, 16).replace("T", " ") ?? "",
        Status: i.moderation_status,
      })),
      "flagged-content",
    );
  };

  const columns = useMemo<ColumnDef<FlaggedContentItem>[]>(
    () => [
      {
        accessorKey: "conversation_name",
        header: "Group",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-slate-600 max-w-[120px] truncate block">
            {row.original.conversation_name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "content_preview",
        header: "Flagged Message",
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <div className="text-[11px] font-bold text-slate-800 line-clamp-2">
              {row.original.content_preview || "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "sender_first_name",
        header: "User",
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
        header: "Reason",
        cell: ({ row }) => (
          <div>
            <span className="text-[10px] font-bold text-slate-700">
              {row.original.report_reason}
            </span>
            {row.original.ai_detected && (
              <span className="ml-1.5 px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[8px] font-black">
                AI
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "ai_confidence",
        header: "Confidence",
        cell: ({ row }) => {
          const confidence = row.original.ai_confidence;
          if (confidence === null || confidence === undefined) {
            return <span className="text-[10px] text-slate-300">—</span>;
          }
          const pct = Math.round(confidence <= 1 ? confidence * 100 : confidence);
          return (
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                pct >= 80
                  ? "text-red-600 bg-red-50"
                  : pct >= 50
                    ? "text-amber-600 bg-amber-50"
                    : "text-slate-500 bg-slate-50"
              }`}
            >
              {pct}%
            </span>
          );
        },
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
          const pending = item.moderation_status === "pending_review";
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setContextItem(item)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 text-sm"
                title="Context"
              >
                🔍
              </button>
              {canModerate && (
                <>
                  <button
                    onClick={() => handleModerate(item, "dismiss")}
                    disabled={!pending}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Dismiss"
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => handleModerate(item, "warn")}
                    disabled={!pending}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Warn"
                  >
                    ⚠️
                  </button>
                  <button
                    onClick={() => handleModerate(item, "remove")}
                    disabled={!pending}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => handleModerate(item, "ban")}
                    disabled={!pending}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-0 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Ban sender"
                  >
                    🚫
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canModerate, handleModerate],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* Alert banner — pending counts by reason */}
      {reasonCounts.size > 0 && (
        <div className="alert al-ic flex flex-wrap items-center gap-2 text-[11px]">
          <strong className="font-black">🚩 Moderation queue:</strong>
          {Array.from(reasonCounts.entries()).map(([reason, count]) => (
            <span key={reason} className="badge badge-red text-[9px]">
              {reason}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search content, group, user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
        >
          <option value="all">All Reasons</option>
          {FLAG_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
        >
          <option value="all">All Groups</option>
          {groupOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        >
          <option value="all">Auto + Manual</option>
          <option value="auto">🤖 AI-detected</option>
          <option value="manual">👤 Manual reports</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="message">Messages</option>
          <option value="conversation">Conversations</option>
        </select>
        <select
          className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="actioned">Actioned</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <button className="btn btn-secondary btn-sm font-bold" onClick={handleExport}>
          📥 Export
        </button>
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
          selectable={false}
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

      {/* Context dialog */}
      {contextItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800">🔍 Flag Context</h3>
            <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 space-y-2">
              <div>
                <span className="font-black text-slate-800">Flagged content:</span>
                <p className="mt-1 whitespace-pre-wrap">{contextItem.content_preview || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="font-black">Group:</span> {contextItem.conversation_name || "—"}</div>
                <div>
                  <span className="font-black">Sender:</span>{" "}
                  {[contextItem.sender_first_name, contextItem.sender_last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </div>
                <div><span className="font-black">Reason:</span> {contextItem.report_reason}</div>
                <div>
                  <span className="font-black">Source:</span>{" "}
                  {contextItem.ai_detected
                    ? `🤖 AI (${contextItem.ai_confidence != null ? `${Math.round(contextItem.ai_confidence <= 1 ? contextItem.ai_confidence * 100 : contextItem.ai_confidence)}%` : "n/a"})`
                    : "👤 Manual report"}
                </div>
                <div>
                  <span className="font-black">Reporter:</span>{" "}
                  {[contextItem.reporter_first_name, contextItem.reporter_last_name]
                    .filter(Boolean)
                    .join(" ") || "System"}
                </div>
                <div>
                  <span className="font-black">Flagged:</span>{" "}
                  {contextItem.flagged_at
                    ? new Date(contextItem.flagged_at).toLocaleString()
                    : "—"}
                </div>
              </div>
              {contextItem.report_detail && (
                <div className="text-[10px]">
                  <span className="font-black">Report detail:</span> {contextItem.report_detail}
                </div>
              )}
              {contextItem.ai_reason && (
                <div className="text-[10px]">
                  <span className="font-black">AI reasoning:</span> {contextItem.ai_reason}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setContextItem(null)}
              >
                Close
              </button>
            </div>
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
              <div className="font-bold text-slate-800 mb-1">Content Preview:</div>
              <div className="line-clamp-3">{actionModal.item.content_preview}</div>
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
