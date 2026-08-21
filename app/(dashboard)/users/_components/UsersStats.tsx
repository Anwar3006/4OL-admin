"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useUserDashboardMetrics } from "@/hooks/supabase-calls/useUser";
import { useUserKpiStats } from "@/hooks/supabase-calls/useAdminUsers";

export default function UsersStats() {
  const { data, isLoading, isError } = useUserDashboardMetrics("30d");
  const kpis = useUserKpiStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="👥" label="Total Users" variant="blue"
        value={data?.total ?? 0} isLoading={isLoading} isError={isError}
        delta={data ? `+${data.new_users} in 30d` : undefined} deltaType="neutral"
      />
      <KpiCard
        icon="✅" label="Active" variant="green"
        value={data?.active ?? 0} isLoading={isLoading} isError={isError}
        delta={data && data.total > 0 ? `${Math.round((data.active / data.total) * 100)}% in last 30d` : undefined}
        deltaType="up"
      />
      <KpiCard
        icon="⭐" label="Premium" variant="amber"
        value={data?.premium ?? 0} isLoading={isLoading} isError={isError}
        delta={data?.premium ? undefined : "Awaiting subscriptions (Epic 16)"}
        deltaType="neutral"
      />
      <KpiCard
        icon="⏳" label="Pending Verification" variant="gold"
        value={data?.pending_verification ?? 0} isLoading={isLoading} isError={isError}
        delta={data?.pending_verification ? "Awaiting verification" : "All verified"}
        deltaType="neutral"
      />
      <KpiCard
        icon="🚩" label="Flagged" variant="red"
        value={data?.flagged ?? 0} isLoading={isLoading} isError={isError}
        delta={data?.flagged ? "Pending moderation review" : "None"}
        deltaType="neutral"
      />
      <KpiCard
        icon="🗑️" label="Delete Requests" variant="red"
        value={data?.delete_requests_pending ?? 0} isLoading={isLoading} isError={isError}
        delta={data?.delete_requests_pending ? "Awaiting action" : "None pending"}
        deltaType="neutral"
      />
      <KpiCard
        icon="🏥" label="NHIS Linked" variant="teal"
        value={kpis.data?.stats.nhis_linked ?? 0}
        isLoading={kpis.isLoading} isError={kpis.isError}
        delta="Insurance cards on file"
        deltaType="neutral"
      />
    </div>
  );
}
