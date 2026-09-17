"use client";

import KpiCard from "@/components/redesign/KpiCard";
import { CreditCard, Dumbbell, Layers3, Sparkles, Users, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { useSubscriptionsStats } from "@/features/subscriptions/data/useSubscriptionsStats";
import { useSubscriptionsOverview } from "@/features/subscriptions/data/useSubscriptionsOverview";
import { formatCurrency } from "@/lib/format";

/**
 * The entitlements bento (Active/Total hero + scope breakdown, from
 * app/api/subscriptions/admin's `stats` field) PLUS the real MRR/Premium
 * Users/Retention/At-Risk numbers, moved here from Marketing's Subscriptions
 * tab (features/subscriptions/api/overview.ts -> get_marketing_overview()).
 */
export default function OverviewTab() {
  const { data: stats, isLoading, isError } = useSubscriptionsStats();
  const overview = useSubscriptionsOverview();
  const scopePct = (n: number) => (stats && stats.active > 0 ? Math.round((n / stats.active) * 100) : 0);

  // Real week-over-week growth direction from new_grants_trend (always 8
  // points, server-side, app/api/subscriptions/admin/route.ts).
  const grantsTrend = stats?.new_grants_trend.map((p) => p.value) ?? [];
  const lastWeekGrants = grantsTrend[grantsTrend.length - 1] ?? 0;
  const prevWeekGrants = grantsTrend[grantsTrend.length - 2] ?? 0;
  const grantsWowPct = prevWeekGrants > 0 ? Math.round(((lastWeekGrants - prevWeekGrants) / prevWeekGrants) * 100) : null;
  const grantsDirection: "up" | "down" | "flat" | "neutral" =
    lastWeekGrants > prevWeekGrants ? "up" : lastWeekGrants < prevWeekGrants ? "down" : "flat";
  const grantsDeltaText =
    prevWeekGrants > 0
      ? `${Math.abs(grantsWowPct!)}% vs last week`
      : lastWeekGrants > 0
        ? `+${lastWeekGrants} new vs 0 last week`
        : "No new grants this week";

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      {/* ── Premium/MRR/Retention/At-Risk (get_marketing_overview) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="size-4" />}
          label="Premium Users"
          value={overview.data?.premium_users ?? 0}
          variant="blue"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Monthly Recurring Revenue"
          value={formatCurrency(overview.data?.mrr ?? 0)}
          variant="green"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<RefreshCw className="size-4" />}
          label="Retention Rate"
          value={`${(overview.data?.retention_pct ?? 0).toFixed(1)}%`}
          variant="teal"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<AlertTriangle className="size-4" />}
          label="At-Risk Subscribers"
          value={overview.data?.at_risk ?? 0}
          variant="red"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
      </div>

      {/*
        Only the hero gets a chart: `new_grants_trend` is a real 8-week
        series (grants grouped by created_at, computed server-side from rows
        already fetched for pagination — app/api/subscriptions/admin/
        route.ts). The per-scope breakdown below is a snapshot count with
        nothing to chart, so those stay compact.
      */}
      <div className="space-y-4">
        <KpiCard
          icon={<CreditCard className="size-5" />}
          label="Active / Total Subscriptions"
          value={isLoading ? "..." : `${stats?.active ?? 0} / ${stats?.total ?? 0}`}
          delta={isLoading ? undefined : grantsDeltaText}
          deltaType={grantsDirection}
          trend={stats?.new_grants_trend}
          isError={isError}
          variant="blue"
          size="lg"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            icon={<Layers3 className="size-4" />}
            label="Entire app"
            value={isLoading ? "..." : stats?.by_scope.all_access ?? 0}
            delta={`${scopePct(stats?.by_scope.all_access ?? 0)}% of active grants`}
            deltaType="neutral"
            isError={isError}
            variant="purple"
            size="sm"
          />
          <KpiCard
            icon={<Dumbbell className="size-4" />}
            label="Fitness only"
            value={isLoading ? "..." : stats?.by_scope.fitness_only ?? 0}
            delta={`${scopePct(stats?.by_scope.fitness_only ?? 0)}% of active grants`}
            deltaType="neutral"
            isError={isError}
            variant="green"
            size="sm"
          />
          <KpiCard
            icon={<Sparkles className="size-4" />}
            label="Plasence (Period Tracker)"
            value={isLoading ? "..." : stats?.by_scope.period_only ?? 0}
            delta={`${scopePct(stats?.by_scope.period_only ?? 0)}% of active grants`}
            deltaType="neutral"
            isError={isError}
            variant="pink"
            size="sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
        <CreditCard className="mr-2 inline size-4" />
        New paid features should add a service scope here instead of creating their own subscription page.
      </div>
    </div>
  );
}
