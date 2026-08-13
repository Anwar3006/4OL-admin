"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useAdminDashboardMetrics } from "@/hooks/supabase-calls/useAdminDashboard";

export default function AdminStats() {
  const { data, isLoading, isError } = useAdminDashboardMetrics("30d");
  const admins = data?.admins;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="👥" label="Total Admins" variant="blue"
        value={admins?.total ?? 0} isLoading={isLoading} isError={isError}
        delta={admins ? `${admins.by_role?.super_admin ?? 0} super admin(s)` : undefined}
        deltaType="neutral"
      />
      <KpiCard
        icon="✅" label="Active" variant="green"
        value={admins?.active ?? 0} isLoading={isLoading} isError={isError}
        delta={admins && admins.total > 0 ? `${Math.round((admins.active / admins.total) * 100)}% active` : undefined}
        deltaType="up"
      />
      <KpiCard
        icon="⏳" label="Pending" variant="gold"
        value={admins?.pending ?? 0} isLoading={isLoading} isError={isError}
        delta={admins?.pending ? "Unaccepted invites" : "No active invites"}
        deltaType="neutral"
      />
      <KpiCard
        icon="🚫" label="Inactive" variant="red"
        value={(admins?.inactive ?? 0) + (admins?.suspended ?? 0) + (admins?.banned ?? 0)}
        isLoading={isLoading} isError={isError}
        delta="Inactive + suspended + banned"
        deltaType="neutral"
      />
      <KpiCard
        icon="🔓" label="MFA Not Set" variant="red"
        value={admins?.mfa_not_set ?? 0} isLoading={isLoading} isError={isError}
        delta={admins?.mfa_not_set ? "⚠️ Security risk" : "All admins covered"}
        deltaType={admins?.mfa_not_set ? "down" : "neutral"}
      />
      <KpiCard
        icon="🟢" label="Online Now" variant="blue"
        value={admins?.online_now ?? 0} isLoading={isLoading} isError={isError}
        delta="Active session, last 15m"
        deltaType="neutral"
      />
    </div>
  );
}
