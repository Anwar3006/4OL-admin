"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useReviewKpiStats } from "@/hooks/supabase-calls/useReviews";
import { useSearchParams } from "next/navigation";

function formatDelta(delta: number | undefined, suffix: string): { delta: string; deltaType: "up" | "down" | "neutral" } {
  const value = delta ?? 0;
  if (value === 0) return { delta: `No change ${suffix}`, deltaType: "neutral" };
  const deltaType = value > 0 ? "up" : "down";
  return { delta: `${value > 0 ? "+" : ""}${value}% ${suffix}`, deltaType };
}

export default function ReviewStats() {
  const { data, isLoading } = useReviewKpiStats();
  

  const total = formatDelta(data?.total_delta, "this month");
  const pending = formatDelta(data?.pending_delta, "this month");
  // Flagged reviews going up is bad news, so invert the up/down semantics.
  const flaggedRaw = data?.flagged_delta ?? 0;
  const flagged = {
    delta: flaggedRaw === 0 ? "No change this month" : `${flaggedRaw > 0 ? "+" : ""}${flaggedRaw}% this month`,
    deltaType: (flaggedRaw === 0 ? "neutral" : flaggedRaw > 0 ? "down" : "up") as "up" | "down" | "neutral",
  };

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
        icon="🚩"
        label="Flagged"
        value={isLoading ? "..." : (data?.flagged_reviews ?? 0).toLocaleString()}
        variant="red"
        delta={isLoading ? undefined : flagged.delta}
        deltaType={flagged.deltaType}
      />
      <KpiCard
        icon="⏳"
        label="Pending Approval"
        value={isLoading ? "..." : (data?.pending_reviews ?? 0).toLocaleString()}
        variant="gold"
        delta={isLoading ? undefined : pending.delta}
        deltaType={pending.deltaType}
      />
    </div>
  );
}
