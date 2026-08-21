"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/stores/permission-context";

// Quick actions are permission-aware: each entry only renders when the caller
// holds the target permission (Gap Analysis Part D).
export default function QuickActions() {
  const router = useRouter();
  const canBroadcast = useHasPermission("notifications.create");
  const canViewUsers = useHasPermission("users.view");
  const canViewFacilities = useHasPermission("facilities.view");
  const canViewTransactions = useHasPermission("transactions.view");
  const canViewJobs = useHasPermission("jobs.view");
  const canViewSecurity = useHasPermission("security.view");
  const canViewAdmins = useHasPermission("admins.view");

  const actions = [
    canBroadcast && { label: "📣 Send Broadcast", onClick: () => router.push("/notifications") },
    canViewUsers && { label: "👤 Manage Users", onClick: () => router.push("/users") },
    canViewFacilities && { label: "🏥 Review Facilities", onClick: () => router.push("/facilities?status=pending") },
    canViewTransactions && { label: "💳 View Transactions", onClick: () => router.push("/transactions") },
    canViewJobs && { label: "💼 Review Job Posts", onClick: () => router.push("/jobs") },
    (canViewSecurity || canViewAdmins) && { label: "🔐 Force MFA", onClick: () => router.push("/admins") },
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  return (
    <div className="card">
      <h2 className="card-title mb-4">⚡ Quick Actions</h2>
      <div className="space-y-2">
        {actions.length === 0 && (
          <div className="text-[11px] text-slate-400">No actions available for your role.</div>
        )}
        {actions.map((action) => (
          <button
            key={action.label}
            className={`btn w-full justify-start ${action.label.includes("MFA") ? "btn-danger" : "btn-secondary"}`}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
