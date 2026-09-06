"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useReviewKpiStats } from "@/features/reviews/data/useReviews";

function formatDelta(delta: number | null | undefined, suffix: string): { delta: string; deltaType: "up" | "down" | "neutral" } {
  if (delta === null || delta === undefined) {
    return { delta: `No prior ${suffix}`, deltaType: "neutral" };
  }
  const value = delta;
  if (value === 0) return { delta: `No change ${suffix}`, deltaType: "neutral" };
  const deltaType = value > 0 ? "up" : "down";
  return { delta: `${value > 0 ? "+" : ""}${value}% ${suffix}`, deltaType };
}

export default function ReviewStats() {
  const { data, isLoading } = useReviewKpiStats();

  const total = formatDelta(data?.total_delta, "this month");
  const pending = formatDelta(data?.pending_delta, "this month");
  const approved = formatDelta(data?.approved_delta, "this month");

  return (
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
      />
    </div>
  );
}
