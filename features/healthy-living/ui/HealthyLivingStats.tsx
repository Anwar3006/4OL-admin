"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";

interface HealthyLivingKpiData {
  total_articles: number;
  total_delta: number;
  published_articles: number;
  published_delta: number;
  total_views: number;
}

export default function HealthyLivingStats() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<HealthyLivingKpiData | null>({
    queryKey: ["healthy-living-kpi-stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_healthy_living_kpi_stats");

      if (error) {
        console.error("Error fetching Healthy Living KPI stats:", error);
        throw error;
      }

      // get_healthy_living_kpi_stats is declared RETURNS TABLE(...), so
      // PostgREST hands back a one-element ARRAY, not an object. Casting that
      // straight to HealthyLivingKpiData type-checked but left every field
      // undefined at runtime — and an array is truthy, so the `!stats` guard
      // below waved it through to stats.total_articles.toLocaleString().
      const row = (Array.isArray(data) ? data[0] : data) as
        | HealthyLivingKpiData
        | undefined;
      if (!row) return null;

      return {
        total_articles: Number(row.total_articles ?? 0),
        total_delta: Number(row.total_delta ?? 0),
        published_articles: Number(row.published_articles ?? 0),
        published_delta: Number(row.published_delta ?? 0),
        total_views: Number(row.total_views ?? 0),
      };
    }
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full"></div>;
  }

  if (isError || !stats) {
    return (
      <div className="h-24 flex items-center justify-center rounded-xl mb-6 w-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-sm">
        Failed to load Healthy Living stats.
      </div>
    );
  }

  // Helper to format deltas. get_healthy_living_kpi_stats() (supabase/
  // migrations/20260822_content_analytics_carousel_extension.sql) always
  // computes a real last-30-days-vs-prior-30-days ratio server-side — it
  // never returns "no comparison available" — so a delta of exactly 0 is a
  // genuine stagnation reading, not a missing one. That makes "flat" (amber)
  // the correct type for 0, not "neutral" (gray, reserved for when no prior
  // period exists to compare against at all); this page was hardcoding the
  // zero case to "neutral" the same way Subscriptions used to.
  const formatDelta = (delta: number) => {
    const sign = delta > 0 ? "+" : "";
    return {
      text: delta === 0 ? "No change vs last month" : `${sign}${delta}% vs last month`,
      type: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    } as const;
  };

  const publishedDelta = formatDelta(stats.published_delta);

  // Formatter for large numbers (e.g., 48000 -> 48K)
  const formatNumber = (num: number) => Intl.NumberFormat("en-US", { notation: "compact" }).format(num);

  const publishedPct = stats.total_articles > 0 ? Math.round((stats.published_articles / stats.total_articles) * 100) : 0;

  return (
    // Neither card has a stored dated series to chart (both `_delta` fields
    // are single point-in-time ratios, not multi-point history), so neither
    // qualifies for `lg`/trend sizing (Rule 1). Total Content and Published
    // count the same entity (healthy_living_info rows), with Published a
    // strict subset — same relationship as Subscriptions' Active/Total — so
    // they merge into one "Published / Total" card instead of restating the
    // total twice; Total Views stays separate since it's a different metric
    // (a lifetime engagement counter, not a content-count breakdown).
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="✅"
        label="Published / Total Content"
        value={`${stats.published_articles.toLocaleString()} / ${stats.total_articles.toLocaleString()}`}
        variant="green"
        delta={`${publishedPct}% live · ${publishedDelta.text}`}
        deltaType={publishedDelta.type}
      />
      <KpiCard
        size="sm"
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