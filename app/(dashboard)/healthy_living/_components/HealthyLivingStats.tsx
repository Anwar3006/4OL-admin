"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";

interface HealthyLivingKpiData {
  total_articles: number;
  total_delta: number;
  published_articles: number;
  published_delta: number;
  total_views: number;
}

export default function HealthyLivingStats() {
  const { data: stats, isLoading, isError } = useQuery<HealthyLivingKpiData>({
    queryKey: ["healthy-living-kpi-stats"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_healthy_living_kpi_stats");

      if (error) {
        console.error("Error fetching Healthy Living KPI stats:", error);
        throw error;
      }
      return data as HealthyLivingKpiData;
    }
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-slate-100 rounded-xl mb-6 w-full"></div>;
  }

  if (isError || !stats) {
    return (
      <div className="h-24 flex items-center justify-center rounded-xl mb-6 w-full bg-red-50 text-red-600 text-sm">
        Failed to load Healthy Living stats.
      </div>
    );
  }

  // Helper to format deltas
  const formatDelta = (delta: number) => {
    const isPositive = delta > 0;
    const sign = isPositive ? "+" : "";
    return {
      text: `${sign}${delta}% vs last month`,
      type: isPositive ? "up" : delta < 0 ? "down" : "neutral",
    } as const;
  };

  const totalDelta = formatDelta(stats.total_delta);
  const publishedDelta = formatDelta(stats.published_delta);

  // Formatter for large numbers (e.g., 48000 -> 48K)
  const formatNumber = (num: number) => Intl.NumberFormat("en-US", { notation: "compact" }).format(num);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Total Content"
        value={stats.total_articles.toLocaleString()}
        variant="blue"
        delta={totalDelta.text}
        deltaType={totalDelta.type}
      />
      <KpiCard
        icon="✅"
        label="Published"
        value={stats.published_articles.toLocaleString()}
        variant="green"
        delta={publishedDelta.text}
        deltaType={publishedDelta.type}
      />
      <KpiCard
        icon="👁️"
        label="Total Views"
        value={formatNumber(stats.total_views)}
        variant="teal"
        delta="Lifetime views"
        deltaType="neutral"
      />
    </div>
  );
}