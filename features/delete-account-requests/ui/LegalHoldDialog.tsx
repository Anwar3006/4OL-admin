"use client";

/**
 * Place-a-legal-hold modal (Epic 3.4). Same inline-modal style as the
 * "Manual Entry" dialog on DeleteAccountRequestsPage.tsx.
 */

import React, { useState } from "react";
import { usePlaceLegalHold } from "@/features/delete-account-requests/data/useDeleteAccountRequests";

export default function LegalHoldDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [matterReference, setMatterReference] = useState("");
  const placeMutation = usePlaceLegalHold();

  const submit = () => {
    if (!reason.trim()) return;
    placeMutation.mutate(
      { userId, reason: reason.trim(), matterReference: matterReference.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-[13px] w-[440px] max-w-full shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-1">
          ⚖️ Place Legal Hold
        </h3>
        <p className="text-2xs text-slate-400 font-bold mb-4">
          Excludes this account from deletion/anonymization — including the
          7-year financial retention sweep — until released.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Reason *</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this account under hold?"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Matter reference</label>
            <input
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              value={matterReference}
              onChange={(e) => setMatterReference(e.target.value)}
              placeholder="Case/ticket reference (optional)"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary text-white text-xs"
            disabled={!reason.trim() || placeMutation.isPending}
            onClick={submit}
          >
            ⚖️ Place Hold
          </button>
        </div>
      </div>
    </div>
  );
}
