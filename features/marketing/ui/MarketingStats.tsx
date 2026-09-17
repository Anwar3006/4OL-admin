"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { apiFetch } from "@/lib/api-fetch";
import { useQuery } from "@tanstack/react-query";

type Stats = {
  draft: number;
  scheduled: number;
  live: number;
  paused: number;
  ended: number;
  pending_review: number;
  rejected: number;
};

/**
 * Gap Analysis Part M (M4): Pending Review KPI joins the status row; data
 * comes from the RBAC-guarded campaigns endpoint instead of client-side
 * Supabase.
 *
 * No card here gets a trend. `status` on marketing_profile is a mutable
 * current-state field with no state-transition history table behind it, so
 * bucketing by `createdAt` would chart "when campaigns were created," not
 * "how many were live/paused/etc. over time" — exactly the
 * approximate-to-the-point-of-misleading case to avoid. The list endpoint
 * this reads is also called with `limit=1` (only `analytics` — the
 * aggregate counts computed server-side across all rows — is used), so
 * there isn't even a batch of dated rows already in hand to bucket. Pending
 * Review (the actionable queue) and Live (current operational state) lead;
 * the rest are secondary detail.
 */
export default function MarketingStats() {
  const { data: stats } = useQuery({
    queryKey: ["marketing-stats"],
    queryFn: async () => {
      const result = await apiFetch<{ analytics: Stats }>(
        "/api/marketing/campaigns?page=1&limit=1",
      );
      return result.analytics;
    },
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="🔍" label="Pending Review" value={stats?.pending_review || 0} variant="indigo" delta="Business submissions" deltaType="neutral" />
      {/* "up" implied a real increase with nothing to compare against — this is a snapshot count, so "neutral" is the honest signal. */}
      <KpiCard icon="✅" label="Live" value={stats?.live || 0} variant="green" delta="Running now" deltaType="neutral" />
      <KpiCard icon="⏳" label="Draft" value={stats?.draft || 0} variant="amber" delta="Ready to launch" deltaType="neutral" size="sm" />
      <KpiCard icon="⏸️" label="Paused" value={stats?.paused || 0} variant="blue" delta="Manually paused" deltaType="neutral" size="sm" />
      <KpiCard icon="📊" label="Ended" value={stats?.ended || 0} variant="teal" delta="Completed" deltaType="neutral" size="sm" />
    </div>
  );
}
