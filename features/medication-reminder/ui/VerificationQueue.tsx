"use client";

import React, { useState } from "react";
import {
  useVerificationQueue,
  useVerificationAction,
  useDrugs,
  type VerificationRequest,
} from "@/features/medication-reminder/data/useDrugs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-amber",
  auto_matched: "badge-blue",
  verified: "badge-green",
  rejected: "badge-red",
};

/**
 * Unknown-drug verification queue (Gap Analysis B.6 step 4). Mobile
 * submissions of drug names that missed the catalog land here for
 * pharmacist-style sign-off: approve as new, map to existing, or reject.
 */
export default function VerificationQueue() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data, isLoading } = useVerificationQueue(statusFilter);
  const action = useVerificationAction();

  const [mapTarget, setMapTarget] = useState<VerificationRequest | null>(null);

  const requests = data?.requests || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mr-auto">
          🔎 Unknown-Drug Verification Queue
        </h4>
        <select
          className="h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="auto_matched">Auto-Matched</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse bg-slate-100 rounded-xl" />
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          No verification requests in this queue
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate">
                  “{req.entered_name}”
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(req.created_at).toLocaleString()}
                  {req.matched_drug && (
                    <> → matched: <span className="font-bold text-slate-600">{req.matched_drug.name}</span></>
                  )}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE[req.status] || "badge-amber"}`}>
                {req.status.replace(/_/g, " ")}
              </span>

              {(req.status === "pending" || req.status === "auto_matched") && (
                <div className="flex gap-1.5">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate({ action: "approve_new", requestId: req.id, name: req.entered_name })
                    }
                  >
                    ✅ Approve as New
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setMapTarget(req)}
                  >
                    🔗 Map to Existing
                  </button>
                  <button
                    className="btn btn-secondary btn-sm text-red-600"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ action: "reject", requestId: req.id })}
                  >
                    🚫 Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <MapToExistingDialog request={mapTarget} onClose={() => setMapTarget(null)} />
    </div>
  );
}

function MapToExistingDialog({
  request,
  onClose,
}: {
  request: VerificationRequest | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);
  const { data } = useDrugs({ search: debounced || undefined, limit: 8 });
  const action = useVerificationAction();

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🔗 Map “{request?.entered_name}” to an existing drug</DialogTitle>
        </DialogHeader>

        <input
          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="🔍 Search the drug catalog…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
          {(data?.drugs || []).map((drug) => (
            <button
              key={drug.id}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50/50 transition-colors cursor-pointer"
              disabled={action.isPending}
              onClick={() =>
                request &&
                action.mutate(
                  { action: "map_existing", requestId: request.id, drugId: drug.id, linkReminder: true },
                  { onSuccess: onClose },
                )
              }
            >
              <div className="text-xs font-bold text-slate-800">{drug.name}</div>
              <div className="text-[10px] text-slate-400">
                {drug.generic_name || "—"} · {drug.category || "Uncategorised"}
              </div>
            </button>
          ))}
          {(data?.drugs || []).length === 0 && debounced && (
            <div className="px-3 py-4 text-[11px] text-slate-400 text-center">
              No catalog matches — try another spelling.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
