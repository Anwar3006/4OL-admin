"use client";

import React, { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProviderCredentials, useReviewCredential } from "../../data/useProviderTabs";
import type { CredentialStatus } from "../../schema/types";

const STATUS_STYLE: Record<CredentialStatus, string> = {
  verified: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  pending: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  rejected: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  expired: "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  revoked: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
};

function RejectDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Reject credential</DialogTitle>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being rejected?" rows={4} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={() => onConfirm(reason.trim())}>
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CredentialsTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderCredentials(providerId);
  const review = useReviewCredential(providerId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        No credentials submitted yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((c) => (
        <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-800 dark:text-slate-200">{c.credential_type_label ?? c.credential_type}</span>
              {c.regulator && <span className="text-2xs font-bold uppercase tracking-widest text-slate-400">{c.regulator}</span>}
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border", STATUS_STYLE[c.status])}>
                {c.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              № {c.number}
              {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
            </div>
            {c.rejection_reason && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{c.rejection_reason}</div>}
            {c.document_path && (
              <a
                href={`/api/providers/credentials/${c.provider_id}/${c.document_path.split("/").pop()}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                View document <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {c.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ credentialId: c.id, status: "verified" })}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectingId(c.id)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}

      <RejectDialog
        open={!!rejectingId}
        onClose={() => setRejectingId(null)}
        isPending={review.isPending}
        onConfirm={(reason) => {
          if (!rejectingId) return;
          review.mutate({ credentialId: rejectingId, status: "rejected", rejection_reason: reason }, { onSuccess: () => setRejectingId(null) });
        }}
      />
    </div>
  );
};

export default CredentialsTab;
