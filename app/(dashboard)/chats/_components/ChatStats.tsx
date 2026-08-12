"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useSupportAnalytics } from "@/hooks/supabase-calls/useConversation";

export default function ChatStats() {
  const { data: analytics, isLoading } = useSupportAnalytics("30");

  const formatDelta = (delta: number | null | undefined): string => {
    if (delta === null || delta === undefined) return "No prior period";
    if (delta === 0) return "No change";
    return `${delta > 0 ? "+" : ""}${delta}%`;
  };

  const deltaType = (delta: number | null | undefined): "up" | "down" | "neutral" => {
    if (delta === null || delta === undefined) return "neutral";
    if (delta > 0) return "up";
    if (delta < 0) return "down";
    return "neutral";
  };

  const groupDelta = analytics?.groups?.delta?.percent;
  const supportDelta = analytics?.support?.delta?.percent;
  const avgResponseMinutes = analytics?.support?.avg_first_response_minutes;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Total Groups"
        value={isLoading ? "..." : (analytics?.groups?.total ?? 0)}
        variant="blue"
        delta={isLoading ? "" : formatDelta(groupDelta)}
        deltaType={deltaType(groupDelta)}
      />
      <KpiCard
        icon="👥"
        label="Group Members"
        value={isLoading ? "..." : (analytics?.groups?.members ?? 0)}
        variant="green"
        delta={isLoading ? "" : "Live members"}
        deltaType="neutral"
      />
      <KpiCard
        icon="🚩"
        label="Open Support"
        value={isLoading ? "..." : (analytics?.support?.open ?? 0)}
        variant="red"
        delta={isLoading ? "" : formatDelta(supportDelta)}
        deltaType={deltaType(supportDelta)}
      />
      <KpiCard
        icon="⏱️"
        label="Avg First Response"
        value={
          isLoading
            ? "..."
            : avgResponseMinutes === null || avgResponseMinutes === undefined
              ? "No data"
              : `${Math.round(avgResponseMinutes)}m`
        }
        variant="green"
        delta={isLoading ? "" : `${analytics?.support?.unassigned ?? 0} unassigned`}
        deltaType={(analytics?.support?.unassigned ?? 0) > 0 ? "down" : "neutral"}
      />
    </div>
  );
}
