"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useUserDashboardMetrics } from "@/features/users/data/useUser";
import { useUserKpiStats } from "@/features/users/data/useAdminUsers";

export default function UsersStats() {
  const { data, isLoading, isError } = useUserDashboardMetrics("30d");
  const kpis = useUserKpiStats();

  // Real (not fabricated) growth signal: new_users is an actual count of
  // signups within the selected 30d window, from the same RPC snapshot —
  // zero new users is a genuine "flat" (stagnation), distinct from
  // "neutral" (no comparison possible at all). There's still no stored
  // history of past-period totals to chart a multi-point trend against, so
  // this stays a plain number with a real directional badge rather than a
  // sparkline — see get_user_dashboard_metrics in
  // supabase/migrations/20260813_epic12_user_management.sql.
  const newUsers = data?.new_users ?? 0;
  const totalUsersDirection: "up" | "flat" | "neutral" = !data ? "neutral" : newUsers > 0 ? "up" : "flat";

  return (
    <div className="space-y-4 mb-6">
      {/* Growth (Total Users) and moderation backlog (Flagged) are the two
          decision-relevant numbers on this page; the rest are context. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <KpiCard
          icon="👥" label="Total Users" variant="blue" size="default"
          value={data?.total ?? 0} isLoading={isLoading} isError={isError}
          delta={data ? (newUsers > 0 ? `+${newUsers} in 30d` : "No new users in 30d") : undefined}
          deltaType={totalUsersDirection}
        />
        <KpiCard
          icon="🚩" label="Flagged" variant="red" size="default"
          value={data?.flagged ?? 0} isLoading={isLoading} isError={isError}
          delta={data?.flagged ? "Pending moderation review" : "None"}
          deltaType="neutral"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <KpiCard
          icon="✅" label="Active" variant="green" size="sm"
          value={data?.active ?? 0} isLoading={isLoading} isError={isError}
          delta={data && data.total > 0 ? `${Math.round((data.active / data.total) * 100)}% in last 30d` : undefined}
          deltaType="up"
        />
        <KpiCard
          icon="⭐" label="Premium" variant="amber" size="sm"
          value={data?.premium ?? 0} isLoading={isLoading} isError={isError}
          delta={data?.premium ? undefined : "Awaiting subscriptions (Epic 16)"}
          deltaType="neutral"
        />
        <KpiCard
          icon="⏳" label="Pending Verification" variant="gold" size="sm"
          value={data?.pending_verification ?? 0} isLoading={isLoading} isError={isError}
          delta={data?.pending_verification ? "Awaiting verification" : "All verified"}
          deltaType="neutral"
        />
        <KpiCard
          icon="🗑️" label="Delete Requests" variant="red" size="sm"
          value={data?.delete_requests_pending ?? 0} isLoading={isLoading} isError={isError}
          delta={data?.delete_requests_pending ? "Awaiting action" : "None pending"}
          deltaType="neutral"
        />
        <KpiCard
          icon="🏥" label="NHIS Linked" variant="teal" size="sm"
          value={kpis.data?.stats.nhis_linked ?? 0}
          isLoading={kpis.isLoading} isError={kpis.isError}
          delta="Insurance cards on file"
          deltaType="neutral"
        />
      </div>
    </div>
  );
}
