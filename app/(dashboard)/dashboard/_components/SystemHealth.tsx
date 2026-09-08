import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function SystemHealth({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const rows = [
    {
      label: "Dashboard RPC",
      value: loading ? "Checking" : metrics ? "Connected" : "Unavailable",
      color: metrics ? "text-ek-green-dark" : "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Activity Feed",
      value: loading ? "Checking" : `${metrics?.activity.length ?? 0} latest rows`,
      color: "text-ek-blue",
    },
    {
      label: "Transactions",
      value: metrics?.finance.revenue_status === "live" ? "Live" : "Awaiting pipeline",
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Security Score",
      value: "Awaiting instrumentation",
      color: "text-slate-500",
    },
    {
      label: "Expo Push Delivery",
      value: "See Notifications > Campaigns",
      color: "text-slate-500",
    },
  ];

  return (
    <div className="card">
      <h2 className="card-title mb-4">System Health</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">{row.label}</span>
            <span className={`font-bold ${row.color}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
