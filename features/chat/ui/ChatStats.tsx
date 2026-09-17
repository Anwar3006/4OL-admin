"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useSupportAnalytics } from "@/features/chat/data/useConversation";

export default function ChatStats() {
  const { data: analytics, isLoading } = useSupportAnalytics("30");

  const formatDelta = (delta: number | null | undefined): string => {
    if (delta === null || delta === undefined) return "No prior period";
    if (delta === 0) return "No change";
    return `${delta > 0 ? "+" : ""}${delta}%`;
  };

  // "flat" (a real, computed zero-percent change vs the prior period) is a
  // distinct amber signal from "neutral" (no prior period to compare at
  // all) — collapsing the two hides a genuine stall in support/group
  // growth. count_created_at_delta (supabase/migrations/20260811_epic_
  // 13_14_facility_support_analytics.sql) always returns a real percent
  // once there's a previous-period count to divide by, so 0 here means a
  // real zero change, not "no data."
  const deltaType = (delta: number | null | undefined): "up" | "down" | "flat" | "neutral" => {
    if (delta === null || delta === undefined) return "neutral";
    if (delta > 0) return "up";
    if (delta < 0) return "down";
    return "flat";
  };

  const groupDelta = analytics?.groups?.delta?.percent;
  const supportDelta = analytics?.support?.delta?.percent;
  const avgResponseMinutes = analytics?.support?.avg_first_response_minutes;
  // satisfaction_average is avg(rating) on a 1–5 scale — display as %.
  const satisfaction = analytics?.support?.satisfaction_average;
  const satisfactionPercent =
    satisfaction === null || satisfaction === undefined
      ? null
      : Math.round((satisfaction / 5) * 100);
  const satisfactionCount = analytics?.support?.satisfaction_count ?? 0;

  // get_support_analytics (supabase/migrations/20260811_epic_13_14_
  // facility_support_analytics.sql) returns only a current-vs-previous-
  // period aggregate, not per-day/week history — there is no genuine
  // series to chart here, so none of these cards get a `trend`. Hierarchy
  // instead comes from `size`: Open Support (queue depth) and Avg First
  // Response (SLA-relevant) are what an admin needs first, so they stay
  // the default size; Total Groups, Group Members and Satisfaction are
  // supporting context and go "sm".
  return (
    <div className="space-y-4 sm:space-y-5 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
          // Unassigned-ticket count is a different metric than the minutes
          // shown here, not a before/after read of this card's own value —
          // there's no real comparison to point an arrow at.
          deltaType="neutral"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard
          icon="📊"
          label="Total Groups"
          value={isLoading ? "..." : (analytics?.groups?.total ?? 0)}
          variant="blue"
          delta={isLoading ? "" : formatDelta(groupDelta)}
          deltaType={deltaType(groupDelta)}
          size="sm"
        />
        <KpiCard
          icon="👥"
          label="Group Members"
          value={isLoading ? "..." : (analytics?.groups?.members ?? 0)}
          variant="green"
          delta={isLoading ? "" : "Live members"}
          deltaType="neutral"
          size="sm"
        />
        <KpiCard
          icon="😊"
          label="Satisfaction"
          value={
            isLoading
              ? "..."
              : satisfactionPercent === null
                ? "No data"
                : `${satisfactionPercent}%`
          }
          variant="purple"
          delta={
            isLoading
              ? ""
              : satisfactionCount > 0
                ? `${satisfactionCount} ratings`
                : "No ratings yet"
          }
          deltaType="neutral"
          size="sm"
        />
      </div>
    </div>
  );
}
