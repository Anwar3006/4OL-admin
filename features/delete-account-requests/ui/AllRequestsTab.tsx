"use client";

/**
 * Delete-account request list (Gap Analysis Part Z). Accepts a status
 * filter so the page's Pending / Grace Period / Completed tabs render
 * distinct lists instead of one unfiltered component. Row actions go
 * through the guarded PATCH route (useDeleteRequestAction).
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useDeleteAccountRequests,
  useDeleteRequestAction,
  type DeleteRequestAction,
  type DeleteRequestStatus,
} from "@/features/delete-account-requests/data/useDeleteAccountRequests";
import { usePagination } from "@/hooks/use-pagination";
import { maskPhone } from "@/lib/masking";

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  in_verification: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30",
  grace_period: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/30",
  completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  cancelled: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
};

const ACTIONS_BY_STATUS: Record<DeleteRequestStatus, { action: DeleteRequestAction; label: string; danger?: boolean }[]> = {
  pending_review: [
    { action: "verify", label: "🔍 Verify Identity" },
    { action: "cancel", label: "✖ Cancel", danger: true },
  ],
  in_verification: [
    { action: "resend_otp", label: "📲 Resend OTP" },
    { action: "begin_grace", label: "⏱️ Begin Grace Period" },
    { action: "cancel", label: "✖ Cancel", danger: true },
  ],
  grace_period: [
    { action: "remind_download", label: "📥 Remind Download" },
    { action: "process_now", label: "🗑️ Process Now", danger: true },
    { action: "cancel", label: "↩ Cancel", danger: true },
  ],
  completed: [],
  cancelled: [],
};

export default function AllRequestsTab({ statusFilter }: { statusFilter?: DeleteRequestStatus }) {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({
    key: `delete_req_page_${statusFilter ?? "all"}`,
  });
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useDeleteAccountRequests({
    page,
    limit: pageSize,
    search: search || undefined,
    status: statusFilter,
  });
  const actionMutation = useDeleteRequestAction();

  const requests = data?.requests || [];
  const totalItems = data?.meta?.total || 0;
  const totalPages = Math.max(1, data?.meta?.totalPages || Math.ceil(totalItems / pageSize) || 1);

  const handleAction = (requestId: string, action: DeleteRequestAction) => {
    if (action === "process_now" && !confirm("Process this deletion now? Account data will be anonymized permanently.")) return;
    if (action === "cancel" && !confirm("Cancel this deletion request and restore the user's access?")) return;
    actionMutation.mutate({ requestId, action });
  };

  const exportCsv = () => {
    window.open("/api/admin/delete-account-requests/export", "_blank");
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="h-9 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          onClick={exportCsv}
        >
          📥 Export List
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">Loading requests…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 text-xs font-bold">
            Failed to load requests: {(error as Error)?.message}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs font-bold">No deletion requests in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-3xs font-black uppercase tracking-widest">
                  <th className="px-4 py-2.5">User Request</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Submitted</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
                        {r.first_name} {r.last_name}
                      </div>
                      <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight leading-tight truncate">
                        {r.reason || "Privacy Concerns"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-2xs font-bold text-slate-400">{maskPhone(r.phone_number)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border whitespace-nowrap",
                        STATUS_STYLES[r.status] ?? "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800",
                      )}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-2xs font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
                      {format(new Date(r.created_at), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {ACTIONS_BY_STATUS[r.status].map((a) => (
                          <Button
                            key={a.action}
                            variant="ghost"
                            size="sm"
                            disabled={actionMutation.isPending}
                            className={cn(
                              "h-7 px-2 text-3xs font-black uppercase tracking-widest rounded-lg border",
                              a.danger
                                ? "text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/15"
                                : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
                            )}
                            onClick={() => handleAction(r.id, a.action)}
                          >
                            {a.label}
                          </Button>
                        ))}
                        {ACTIONS_BY_STATUS[r.status].length === 0 && (
                          <span className="text-3xs font-black uppercase tracking-widest text-slate-300">Terminal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-2xs font-black uppercase tracking-widest text-slate-400">
          <span>{totalItems} request(s)</span>
          <div className="flex items-center gap-2">
            <button
              className="h-7 px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900"
              disabled={page <= 1}
              onClick={onPreviousPage}
            >
              ← Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              className="h-7 px-3 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900"
              disabled={page >= totalPages}
              onClick={onNextPage}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
