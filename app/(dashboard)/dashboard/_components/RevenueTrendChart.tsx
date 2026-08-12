import React from "react";
import { TrendChart } from "@/components/charts/TrendChart";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function RevenueTrendChart({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const hasRevenue = metrics?.finance.revenue_status === "live";

  if (!hasRevenue) {
    return (
      <div className="card h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Revenue Trend</h2>
          <span className="badge badge-amber text-[9px]">Awaiting data</span>
        </div>
        <div className="h-64 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center px-6 text-center text-sm text-slate-500">
          {loading
            ? "Loading dashboard metrics..."
            : "Revenue trend will appear after payment ingestion starts writing real transaction records."}
        </div>
      </div>
    );
  }

  return (
    <TrendChart
      title="Revenue Trend"
      description="Completed transaction revenue for the selected window"
      data={[{ period: metrics?.time_filter ?? "selected", revenue: metrics?.finance.revenue ?? 0 }]}
      xKey="period"
      series={[{ key: "revenue", label: "Revenue" }]}
      variant="area"
      height={256}
      className="h-full"
    />
  );
}
