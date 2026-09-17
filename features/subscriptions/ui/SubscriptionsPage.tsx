"use client";

import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { CreditCard, Dumbbell, Layers3, Sparkles } from "lucide-react";
import SubscriptionsTab from "@/features/fitness/ui/SubscriptionsTab";
import { useSubscriptionsStats } from "@/features/subscriptions/data/useSubscriptionsStats";

export default function SubscriptionsPage() {
  const { data: stats, isLoading, isError } = useSubscriptionsStats();
  const activePct =
    stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : null;
  const scopePct = (n: number) => (stats && stats.active > 0 ? Math.round((n / stats.active) * 100) : 0);

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="🎟️ Subscriptions"
        subtitle="Manage access across Plasence, Fitness and future 4 Our Life services from one place."
      />

      {/*
        Only the hero gets a chart: `new_grants_trend` is a real 8-week
        series (grants grouped by created_at, computed server-side from
        rows already fetched for pagination — app/api/subscriptions/admin/
        route.ts). The per-scope breakdown below is a snapshot count with
        nothing to chart, so those stay compact.
      */}
      <div className="space-y-4">
        <KpiCard
          icon={<CreditCard className="size-5" />}
          label="Active / Total Subscriptions"
          value={isLoading ? "..." : `${stats?.active ?? 0} / ${stats?.total ?? 0}`}
          delta={activePct != null ? `${activePct}% currently active` : undefined}
          deltaType="neutral"
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

      <SubscriptionsTab />
    </div>
  );
}
