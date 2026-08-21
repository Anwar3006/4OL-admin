"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminUserRow,
  useUpdateUserPlan,
  useUpdateUserStatus,
} from "@/hooks/supabase-calls/useAdminUsers";

const BULK_PLANS = [
  { value: "free", label: "Free" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "featured", label: "Featured" },
] as const;

function downloadCsv(rows: AdminUserRow[]) {
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const headers = [
    "Public ID",
    "Name",
    "Email",
    "Phone",
    "Plan",
    "NHIS",
    "Region",
    "Status",
    "Joined",
  ];
  const lines = rows.map((row) =>
    [
      row.public_id ?? "",
      row.full_name || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      row.email ?? "",
      row.phone_number ?? "",
      row.plan,
      row.nhis_number ?? "",
      row.region ?? "",
      row.status ?? "",
      row.created_at,
    ]
      .map(escape)
      .join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `users-selected-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface BulkUserActionsDialogProps {
  rows: AdminUserRow[];
  onClose: () => void;
}

// Floating bulk bar only exposes a single trigger, so the selection is handed
// to this dialog which carries the four mockup actions (export, notify, plan
// change, suspend). Values shown here are already masked per caller role.
export default function BulkUserActionsDialog({
  rows,
  onClose,
}: BulkUserActionsDialogProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("premium");
  const [busy, setBusy] = useState(false);
  const updatePlan = useUpdateUserPlan();
  const updateStatus = useUpdateUserStatus();

  const runPlanChange = async () => {
    setBusy(true);
    try {
      await Promise.all(
        rows.map((row) =>
          updatePlan.mutateAsync({
            userId: row.user_id,
            plan: plan as "free" | "standard" | "premium" | "featured",
          }),
        ),
      );
      toast.success(`Plan set to ${plan} for ${rows.length} user(s).`);
      onClose();
    } catch {
      // individual errors already toasted by the mutation
    } finally {
      setBusy(false);
    }
  };

  const runSuspend = async () => {
    setBusy(true);
    try {
      await Promise.all(
        rows.map((row) =>
          updateStatus.mutateAsync({ userId: row.user_id, status: "suspended" }),
        ),
      );
      toast.success(`Suspended ${rows.length} user(s).`);
      onClose();
    } catch {
      // individual errors already toasted by the mutation
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={rows.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bulk actions — {rows.length} user{rows.length > 1 ? "s" : ""} selected
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <button
            className="btn btn-secondary w-full justify-center"
            onClick={() => {
              downloadCsv(rows);
              toast.success("Selected users exported to CSV.");
            }}
          >
            📥 Export Selected (CSV)
          </button>
          <button
            className="btn btn-secondary w-full justify-center"
            onClick={() => {
              onClose();
              router.push("/notifications");
            }}
          >
            📣 Send Notification
          </button>

          <div className="flex items-center gap-2">
            <select
              className="h-9 flex-1 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            >
              {BULK_PLANS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary text-white"
              disabled={busy}
              onClick={runPlanChange}
            >
              Upgrade Plan
            </button>
          </div>

          <button
            className="btn btn-secondary w-full justify-center text-red-600"
            disabled={busy}
            onClick={runSuspend}
          >
            ⏸️ Suspend Selected
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
