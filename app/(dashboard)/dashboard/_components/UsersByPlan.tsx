import React from "react";
import { DistributionDonutChart } from "@/components/charts/DistributionDonutChart";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function UsersByPlan({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const activeSubscriptions = metrics?.subscriptions.active_subscriptions ?? 0;

  if (activeSubscriptions === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Users by Plan</h2>
          <span className="text-slate-400 text-xs font-bold">Subscriptions</span>
        </div>
        <div className="h-48 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6 text-center text-xs text-slate-500">
          {loading
            ? "Loading subscription metrics..."
            : "Plan distribution is awaiting real `user_subscriptions` rows."}
        </div>
      </div>
    );
  }

  return (
    <DistributionDonutChart
      title="Users by Plan"
      data={[{ key: "active", label: "Active Subscriptions", value: activeSubscriptions }]}
      centerLabel="subscriptions"
      height={190}
    />
  );
}
