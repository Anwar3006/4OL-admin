"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { downloadCsv } from "@/lib/csv";
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
} from "@/features/users/data/useAdminUsers";

const BULK_PLANS = [
  { value: "free", label: "Free" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "featured", label: "Featured" },
] as const;

function downloadSelectedUsers(rows: AdminUserRow[]) {
  downloadCsv(
    rows.map((row) => ({
      "Public ID": row.public_id ?? "",
      Name: row.full_name || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      Email: row.email ?? "",
      Phone: row.phone_number ?? "",
      Plan: row.plan,
      NHIS: row.nhis_number ?? "",
      Region: row.region ?? "",
      Status: row.status ?? "",
      Joined: row.created_at,
    })),
    "users-selected",
  );
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
              downloadSelectedUsers(rows);
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
