import React from "react";
import { BreakdownBarChart } from "@/components/charts/BreakdownBarChart";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function RegionalCoverage({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const rows = Object.entries(metrics?.facilities.by_region ?? {})
    .map(([region, facilities]) => ({
      region: region.replaceAll("_", " "),
      facilities,
    }))
    .sort((a, b) => b.facilities - a.facilities);

  if (loading || rows.length === 0) {
    return (
      <div className="card">
        <div className="card-header mb-4">
          <h2 className="card-title">Regional Coverage</h2>
          <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
            Facilities
          </span>
        </div>
        <div className="h-56 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center px-6 text-center text-xs text-slate-500">
          {loading
            ? "Loading regional coverage..."
            : "No facility regions found yet."}
        </div>
      </div>
    );
  }

  return (
    <BreakdownBarChart
      title="Regional Coverage"
      description="Facilities grouped by region"
      data={rows}
      xKey="region"
      series={[{ key: "facilities", label: "Facilities" }]}
      layout="vertical"
      height={224}
    />
  );
}
