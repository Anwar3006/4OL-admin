"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHasPermission } from "@/stores/permission-context";
import {
  IbpRow,
  useIbpAction,
  useIbpActivity,
  useRemoveIbp,
} from "@/features/ibp/data/useIBP";

export const formatMoney = (value: number | null | undefined) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export const STATUS_BADGES: Record<string, string> = {
  pending: "badge badge-amber",
  active: "badge badge-green",
  approved: "badge badge-green",
  rejected: "badge badge-red",
  suspended: "badge badge-slate",
};

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const labelClass = "text-2xs font-black uppercase tracking-widest text-slate-400";
const valueClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";

// ── Activity log dialog ─────────────────────────────────────────────────────

interface IbpActivityDialogProps {
  ibpId: string | null;
  businessName: string;
  onClose: () => void;
}

export function IbpActivityDialog({ ibpId, businessName, onClose }: IbpActivityDialogProps) {
  const { data, isLoading } = useIbpActivity(ibpId);
  const activity = data?.activity ?? [];

  return (
    <Dialog open={Boolean(ibpId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🕓 Activity Log — {businessName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto space-y-2 pt-1">
          {isLoading && <p className="text-xs text-slate-400">Loading activity…</p>}
          {!isLoading && activity.length === 0 && (
            <p className="text-xs text-slate-400">No recorded activity yet.</p>
          )}
          {activity.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <span className="badge badge-blue">{entry.action}</span>
                <span className="text-2xs text-slate-400">{formatDate(entry.created_at)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                by {entry.admin_name ?? "System"}
                {Object.keys(entry.details ?? {}).length > 0 && (
                  <span className="ml-2 text-slate-400">
                    {JSON.stringify(entry.details)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── View / manage dialog ────────────────────────────────────────────────────

interface IbpViewDialogProps {
  ibp: IbpRow | null;
  onClose: () => void;
}

export function IbpViewDialog({ ibp, onClose }: IbpViewDialogProps) {
  const canEdit = useHasPermission("ibp.edit");
  const canDelete = useHasPermission("ibp.delete");
  const action = useIbpAction();
  const remove = useRemoveIbp();
  const [reasonMode, setReasonMode] = useState<"reject" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [activityFor, setActivityFor] = useState<string | null>(null);

  if (!ibp) return null;

  const submitReason = () => {
    if (!reasonMode || reason.trim().length === 0) return;
    action.mutate(
      { id: ibp.id, action: reasonMode, reason: reason.trim() },
      {
        onSuccess: () => {
          setReasonMode(null);
          setReason("");
        },
      },
    );
  };

  const isPending = ibp.status === "pending";
  const isActive = ibp.status === "active" || ibp.status === "approved";
  const isSuspended = ibp.status === "suspended";

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏪 {ibp.business_name}
              <span className={STATUS_BADGES[ibp.status ?? ""] ?? "badge badge-slate"}>
                {ibp.status ?? "unknown"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
            <div>
              <div className={labelClass}>Category</div>
              <div className={valueClass}>
                {ibp.business_category ?? "—"}
                {ibp.specific_category ? ` · ${ibp.specific_category}` : ""}
              </div>
            </div>
            <div>
              <div className={labelClass}>Location</div>
              <div className={valueClass}>
                {[ibp.city, ibp.district, ibp.region].filter(Boolean).join(", ") || "—"}
              </div>
            </div>
            <div>
              <div className={labelClass}>Phone / WhatsApp</div>
              <div className={valueClass}>
                {ibp.phone_number ?? "—"}
                {ibp.whatsapp_number ? ` · WA: ${ibp.whatsapp_number}` : ""}
              </div>
            </div>
            <div>
              <div className={labelClass}>Website</div>
              <div className={valueClass}>{ibp.website ?? "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Branches / Founded</div>
              <div className={valueClass}>
                {ibp.branches ?? 1} branch{(ibp.branches ?? 1) === 1 ? "" : "es"}
                {ibp.founded_year ? ` · est. ${ibp.founded_year}` : ""}
              </div>
            </div>
            <div>
              <div className={labelClass}>TIN</div>
              <div className={valueClass}>{ibp.tin_number ?? "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Campaign Spend</div>
              <div className={valueClass}>
                {formatMoney(ibp.total_spend)}
                {ibp.campaign_budget ? ` of ${formatMoney(ibp.campaign_budget)} budget` : ""}
              </div>
            </div>
            <div>
              <div className={labelClass}>Registered / Verified</div>
              <div className={valueClass}>
                {formatDate(ibp.created_at)} · {formatDate(ibp.verified_at)}
              </div>
            </div>
            {(ibp.registration_docs?.length ?? 0) > 0 && (
              <div className="col-span-2">
                <div className={labelClass}>Registration Documents</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(ibp.registration_docs ?? []).map((doc, index) => (
                    <span key={index} className="badge badge-slate">
                      {doc.type === "rgd" ? `RGD: ${doc.reference}` : doc.reference}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ibp.rejection_reason && (
              <div className="col-span-2">
                <div className={labelClass}>Rejection Reason</div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">{ibp.rejection_reason}</div>
              </div>
            )}
            {ibp.suspended_reason && (
              <div className="col-span-2">
                <div className={labelClass}>Suspension Reason</div>
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">{ibp.suspended_reason}</div>
              </div>
            )}
            {ibp.admin_notes && (
              <div className="col-span-2">
                <div className={labelClass}>Admin Notes</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{ibp.admin_notes}</div>
              </div>
            )}
          </div>

          {reasonMode && (
            <div className="flex items-center gap-2 pt-2">
              <input
                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder={reasonMode === "reject" ? "Reason for rejection…" : "Reason for suspension…"}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <button
                className="btn btn-primary btn-sm text-white"
                disabled={reason.trim().length === 0 || action.isPending}
                onClick={submitReason}
              >
                Confirm
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setReasonMode(null); setReason(""); }}>
                Cancel
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button className="btn btn-secondary btn-sm" onClick={() => setActivityFor(ibp.id)}>
              🕓 Activity Log
            </button>
            {canEdit && isPending && (
              <>
                <button
                  className="btn btn-primary btn-sm text-white"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: ibp.id, action: "verify" })}
                >
                  ✅ Verify & Publish
                </button>
                <button className="btn btn-secondary btn-sm text-red-600 dark:text-red-400" onClick={() => setReasonMode("reject")}>
                  ❌ Reject
                </button>
              </>
            )}
            {canEdit && isActive && (
              <button className="btn btn-secondary btn-sm text-amber-600 dark:text-amber-400" onClick={() => setReasonMode("suspend")}>
                ⏸️ Suspend
              </button>
            )}
            {canEdit && isSuspended && (
              <button
                className="btn btn-primary btn-sm text-white"
                disabled={action.isPending}
                onClick={() => action.mutate({ id: ibp.id, action: "reinstate" })}
              >
                ♻️ Reinstate
              </button>
            )}
            {canDelete && (
              <button
                className="btn btn-secondary btn-sm text-red-600 dark:text-red-400 ml-auto"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Permanently remove "${ibp.business_name}"? This cannot be undone.`)) {
                    remove.mutate(ibp.id, { onSuccess: onClose });
                  }
                }}
              >
                🗑️ Remove Permanently
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <IbpActivityDialog
        ibpId={activityFor}
        businessName={ibp.business_name}
        onClose={() => setActivityFor(null)}
      />
    </>
  );
}
