import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DistributionDonutChart } from "@/components/charts/DistributionDonutChart";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function SubscriberMix({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const byScope = metrics?.subscriptions.by_scope;
  const total = byScope ? byScope.all_access + byScope.fitness_only + byScope.period_only : 0;

  if (loading || total === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="text-sm font-semibold">Subscriber Mix</div>
          <span className="text-slate-400 text-xs font-bold">Subscriptions</span>
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6 text-center text-xs text-slate-500">
            {loading
              ? "Loading subscription metrics..."
              : "Subscriber mix is awaiting active `user_subscriptions` rows."}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Same scope → label mapping already established in
  // features/subscriptions/ui/SubscribersTab.tsx — kept identical so the
  // same scope reads the same way everywhere in the app.
  return (
    <DistributionDonutChart
      title="Subscriber Mix"
      description={`${total.toLocaleString()} active subscriber${total === 1 ? "" : "s"}`}
      data={[
        { key: "fitness_only", label: "Fitness", value: byScope!.fitness_only },
        { key: "period_only", label: "Plasence", value: byScope!.period_only },
        { key: "all_access", label: "Entire app", value: byScope!.all_access },
      ].filter((slice) => slice.value > 0)}
      centerLabel="subscribers"
      height={190}
    />
  );
}
