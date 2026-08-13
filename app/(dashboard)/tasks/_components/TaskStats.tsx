"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useAdminTaskStats } from "@/hooks/supabase-calls/useAdminTasks";

export default function TaskStats() {
  const { data, isLoading, isError } = useAdminTaskStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📥" label="New Tasks" variant="blue"
        value={data?.new ?? 0} isLoading={isLoading} isError={isError}
        delta="Awaiting action" deltaType="neutral"
      />
      <KpiCard
        icon="⚙️" label="In Progress" variant="gold"
        value={data?.in_progress ?? 0} isLoading={isLoading} isError={isError}
        delta="Active work" deltaType="neutral"
      />
      <KpiCard
        icon="🔍" label="Under Review" variant="purple"
        value={data?.under_review ?? 0} isLoading={isLoading} isError={isError}
        delta="SA sign-off" deltaType="neutral"
      />
      <KpiCard
        icon="✅" label="Completed" variant="green"
        value={data?.completed ?? 0} isLoading={isLoading} isError={isError}
        delta="All time" deltaType="up"
      />
    </div>
  );
}
