"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useAdminDashboardMetrics } from "@/features/admins/data/useAdminDashboard";

export default function AdminStats() {
  const { data, isLoading, isError } = useAdminDashboardMetrics("30d");
  const admins = data?.admins;

  return (
    <div className="space-y-4 mb-6">
      {/*
        No real trend here: get_admin_dashboard_metrics (RPC) returns one
        current snapshot per call — total/active/pending/etc. are computed
        fresh each time with no historical admin-count series stored
        anywhere. Its own `activity.recent` is an admin *action* log capped
        at 10 rows — a different signal (what admins did) from "how many
        admins exist/are active," so it can't back a headcount sparkline
        either. These stay plain numbers, sized by what an admin needs to
        see first: Active (who can act right now, per the actual priority
        an admin cares about) and MFA Not Set (a live security risk — also
        the subject of the banner above this row) get the primary slots;
        the rest are secondary context.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <KpiCard
          icon="✅" label="Active" variant="green" size="default"
          value={admins?.active ?? 0} isLoading={isLoading} isError={isError}
          delta={admins && admins.total > 0 ? `${Math.round((admins.active / admins.total) * 100)}% of ${admins.total} admins` : undefined}
          deltaType="up"
        />
        <KpiCard
          icon="🔓" label="MFA Not Set" variant="red" size="default"
          value={admins?.mfa_not_set ?? 0} isLoading={isLoading} isError={isError}
          delta={admins?.mfa_not_set ? "⚠️ Security risk — needs enforcement" : "All admins covered"}
          deltaType={admins?.mfa_not_set ? "down" : "neutral"}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <KpiCard
          icon="👥" label="Total Admins" variant="blue" size="sm"
          value={admins?.total ?? 0} isLoading={isLoading} isError={isError}
          delta={admins ? `${admins.by_role?.super_admin ?? 0} super admin(s)` : undefined}
          deltaType="neutral"
        />
        <KpiCard
          icon="⏳" label="Pending" variant="gold" size="sm"
          value={admins?.pending ?? 0} isLoading={isLoading} isError={isError}
          delta={admins?.pending ? "Unaccepted invites" : "No active invites"}
          deltaType="neutral"
        />
        <KpiCard
          icon="🚫" label="Inactive" variant="red" size="sm"
          value={(admins?.inactive ?? 0) + (admins?.suspended ?? 0) + (admins?.banned ?? 0)}
          isLoading={isLoading} isError={isError}
          delta="Inactive + suspended + banned"
          deltaType="neutral"
        />
        <KpiCard
          icon="🟢" label="Online Now" variant="blue" size="sm"
          value={admins?.online_now ?? 0} isLoading={isLoading} isError={isError}
          delta="Active session, last 15m"
          deltaType="neutral"
        />
      </div>
    </div>
  );
}
