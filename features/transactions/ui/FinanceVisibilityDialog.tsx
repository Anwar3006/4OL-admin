"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useFinanceVisibility,
  useUpdateFinanceVisibility,
  FINANCE_METRIC_LABELS,
} from "@/features/transactions/data/useTransactions";

interface FinanceVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Super-Admin governance dialog: choose which finance metrics stay visible
 * to finance admins and other non-SA roles. Enforcement is server-side in
 * /api/transactions/overview + /api/transactions/tax.
 */
export default function FinanceVisibilityDialog({ open, onOpenChange }: FinanceVisibilityDialogProps) {
  const { data } = useFinanceVisibility(open);
  const save = useUpdateFinanceVisibility();
  // Local overrides layered on top of the server config — avoids syncing state
  // through an effect when the query resolves.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const serverValues = Object.fromEntries(
    (data?.metrics ?? []).map((m) => [m.metric_key, m.visible_to_finance]),
  );

  const handleSave = () => {
    const metrics = Object.keys(FINANCE_METRIC_LABELS).map((metric_key) => ({
      metric_key,
      visible_to_finance: overrides[metric_key] ?? serverValues[metric_key] ?? true,
    }));
    save.mutate(metrics, {
      onSuccess: () => {
        setOverrides({});
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest">
            🔐 Finance Metric Visibility
          </DialogTitle>
        </DialogHeader>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Metrics switched off are hidden from finance admins and other non-super-admin roles.
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {Object.entries(FINANCE_METRIC_LABELS).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between border border-slate-100 rounded-xl p-3 cursor-pointer hover:bg-slate-50"
            >
              <span className="text-xs font-bold text-slate-700">{label}</span>
              <input
                type="checkbox"
                checked={overrides[key] ?? serverValues[key] ?? true}
                onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={save.isPending}
          className="btn btn-primary w-full text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save Visibility Rules"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
