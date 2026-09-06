import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function PendingTasks({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const tasks = [
    {
      label: `${metrics?.queues.pending_facilities ?? 0} facilities pending approval`,
      variant: "amber",
      href: "/facilities?status=pending",
      count: metrics?.queues.pending_facilities ?? 0,
    },
    {
      label: `${metrics?.queues.pending_hcp_verifications ?? 0} HCP verifications pending`,
      variant: "amber",
      href: "/hcp?tab=pending",
      count: metrics?.queues.pending_hcp_verifications ?? 0,
    },
    {
      label: `${metrics?.queues.pending_facility_scout_submissions ?? 0} FacilityScout submissions pending`,
      variant: "blue",
      href: "/facility-scout?tab=pending",
      count: metrics?.queues.pending_facility_scout_submissions ?? 0,
    },
    {
      label: `${metrics?.queues.pending_delete_requests ?? 0} delete-account requests pending`,
      variant: "purple",
      href: "/delete-account-request",
      count: metrics?.queues.pending_delete_requests ?? 0,
    },
    {
      label: `${metrics?.queues.open_security_threats ?? 0} security threats open`,
      variant: "red",
      href: "/security",
      count: metrics?.queues.open_security_threats ?? 0,
    },
    // Extended queues (Gap Analysis Part D) — merge-ins from the API.
    {
      label: `${metrics?.queues.admins_missing_mfa ?? 0} admins without MFA`,
      variant: "red",
      href: "/admins",
      count: metrics?.queues.admins_missing_mfa ?? 0,
    },
    {
      label: `${metrics?.queues.pending_job_posts ?? 0} job posts pending`,
      variant: "blue",
      href: "/jobs",
      count: metrics?.queues.pending_job_posts ?? 0,
    },
    {
      label: `${metrics?.queues.pending_ai_flags ?? 0} AI-detected flags to review`,
      variant: "purple",
      href: "/users?tab=flagged",
      count: metrics?.queues.pending_ai_flags ?? 0,
    },
    {
      label: `${metrics?.queues.flagged_reviews ?? 0} flagged reviews`,
      variant: "amber",
      href: "/reviews",
      count: metrics?.queues.flagged_reviews ?? 0,
    },
  ];
  const total = tasks.reduce((sum, task) => sum + task.count, 0);

  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3">
        <h2 className="card-title text-[13px]">Admin Pending Tasks</h2>
        <span className="badge badge-blue text-[9px]">
          {loading ? "Loading" : `${total} items`}
        </span>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <a
            key={task.href}
            href={task.href}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-slate-50 text-slate-600">
              {loading ? "..." : task.count}
            </div>
            <div className="flex-1 text-[11px] font-bold text-slate-700">
              {loading ? "Loading queue..." : task.label}
            </div>
            <span className={`badge badge-${task.variant} text-[8px] uppercase tracking-widest`}>
              Review
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
