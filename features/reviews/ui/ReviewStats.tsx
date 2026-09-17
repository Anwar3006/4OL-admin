"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useReviewKpiStats } from "@/features/reviews/data/useReviews";

function formatDelta(delta: number | null | undefined, suffix: string): { delta: string; deltaType: "up" | "down" | "flat" | "neutral" } {
  if (delta === null || delta === undefined) {
    // get_review_kpi_stats() returns NULL when the prior 30-day bucket was
    // 0 — there's genuinely nothing to compare against, so "neutral" (gray)
    // is correct here.
    return { delta: `No prior ${suffix}`, deltaType: "neutral" };
  }
  // A real prior-period count existed and the change computed to exactly
  // 0% — that's "flat" (amber, a stagnation signal), not "neutral". Treating
  // a genuine zero-change reading as "no data" was hiding a real stall.
  if (delta === 0) return { delta: `No change ${suffix}`, deltaType: "flat" };
  const deltaType = delta > 0 ? "up" : "down";
  return { delta: `${delta > 0 ? "+" : ""}${delta}% ${suffix}`, deltaType };
}

export default function ReviewStats() {
  const { data, isLoading } = useReviewKpiStats();

  const total = formatDelta(data?.total_delta, "this month");
  const pending = formatDelta(data?.pending_delta, "this month");
  const approved = formatDelta(data?.approved_delta, "this month");

  return (
    // No card gets a trend or `lg`: get_review_kpi_stats() only ever returns
    // a current-30-days count plus a single vs-prior-30-days % delta — two
    // implied points at most, not an ordered series to chart. Total Reviews
    // and Pending Approval (the actionable queue) stay full weight; Avg
    // Rating and Approved are supporting detail, sized down.
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-4">
      <KpiCard
        icon="📊"
        label="Total Reviews"
        value={isLoading ? "..." : (data?.total_reviews ?? 0).toLocaleString()}
        variant="blue"
        delta={isLoading ? undefined : total.delta}
        deltaType={total.deltaType}
      />
      <KpiCard
        icon="⭐"
        label="Avg Rating"
        value={isLoading ? "..." : (data?.average_rating ?? 0).toFixed(1)}
        variant="teal"
        delta={isLoading ? undefined : "From facility_reviews"}
        deltaType="neutral"
        size="sm"
      />
      <KpiCard
        icon="⏳"
        label="Pending Approval"
        value={isLoading ? "..." : (data?.pending_reviews ?? 0).toLocaleString()}
        variant="gold"
        delta={isLoading ? undefined : pending.delta}
        deltaType={pending.deltaType}
      />
      <KpiCard
        icon="✅"
        label="Approved"
        value={isLoading ? "..." : (data?.approved_reviews ?? 0).toLocaleString()}
        variant="green"
        delta={isLoading ? undefined : approved.delta}
        deltaType={approved.deltaType}
        size="sm"
      />
    </div>
  );
}
