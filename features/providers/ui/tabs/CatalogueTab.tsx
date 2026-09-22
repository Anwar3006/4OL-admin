"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProviderCatalogue, useReviewCatalogueItem } from "../../data/useProviderTabs";
import type { CatalogueItemStatus } from "../../schema/types";

const STATUS_STYLE: Record<CatalogueItemStatus, string> = {
  published: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  pending_review: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  draft: "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  rejected: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  archived: "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
};

function RejectDialog({ open, onClose, onConfirm, isPending }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Reject catalogue item</DialogTitle>
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

const CatalogueTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderCatalogue(providerId);
  const review = useReviewCatalogueItem(providerId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        No catalogue items yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-800 dark:text-slate-200">{item.name}</span>
              <span className="badge badge-blue capitalize">{item.item_type}</span>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border", STATUS_STYLE[item.status])}>
                {item.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {item.price != null ? `${item.currency} ${item.price}` : "No price set"}
              {item.capability_required && ` · requires ${item.capability_required}`}
            </div>
            {item.rejection_reason && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{item.rejection_reason}</div>}
          </div>
          {item.status === "pending_review" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ itemId: item.id, status: "published" })}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Publish
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectingId(item.id)}>
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
          review.mutate({ itemId: rejectingId, status: "rejected", rejection_reason: reason }, { onSuccess: () => setRejectingId(null) });
        }}
      />
    </div>
  );
};

export default CatalogueTab;
