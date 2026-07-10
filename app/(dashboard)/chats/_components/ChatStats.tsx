"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useChatKpiStats } from "@/hooks/supabase-calls/useConversation";

export default function ChatStats() {
  const { data: stats, isLoading } = useChatKpiStats();

  const formatDelta = (delta: number): string => {
    if (delta === 0) return "No change";
    return `${delta > 0 ? "+" : ""}${delta}%`;
  };

  const deltaType = (delta: number): "up" | "down" | "neutral" => {
    if (delta > 0) return "up";
    if (delta < 0) return "down";
    return "neutral";
  };

  console.log("ChatStats data:", stats); // --- IGNORE ---

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Total Groups"
        value={isLoading ? "..." : (stats?.total_groups ?? 0)}
        variant="blue"
        delta={isLoading ? "" : formatDelta(stats?.groups_delta ?? 0)}
        deltaType={deltaType(stats?.groups_delta ?? 0)}
      />
      <KpiCard
        icon="👥"
        label="Group Members"
        value={isLoading ? "..." : (stats?.total_members ?? 0)}
        variant="green"
        delta={isLoading ? "" : formatDelta(stats?.members_delta ?? 0)}
        deltaType={deltaType(stats?.members_delta ?? 0)}
      />
      <KpiCard
        icon="🚩"
        label="Unread Support"
        value={isLoading ? "..." : (stats?.unread_support ?? 0)}
        variant="red"
        delta={isLoading ? "" : formatDelta(stats?.support_delta ?? 0)}
        deltaType={deltaType(stats?.support_delta ?? 0)}
      />
      <KpiCard
        icon="⏱️"
        label="Avg Response"
        value={isLoading ? "..." : `${stats?.avg_response_hrs ?? 0}h`}
        variant="green"
        delta={
          isLoading
            ? ""
            : stats?.response_delta
              ? `${stats.response_delta > 0 ? "+" : ""}${stats.response_delta}h`
              : ""
        }
        deltaType={deltaType(stats?.response_delta ?? 0)}
      />
    </div>
  );
}
