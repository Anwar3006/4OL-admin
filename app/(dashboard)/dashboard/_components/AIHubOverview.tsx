import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function AIHubOverview({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const stats = [
    { label: "Calls", value: metrics?.ai.calls ?? 0, variant: "indigo" },
    { label: "Last 24h", value: metrics?.ai.calls_last_24h ?? 0, variant: "blue" },
    { label: "Flags", value: metrics?.queues.pending_moderation_flags ?? 0, variant: "amber" },
    { label: "Cost", value: `₵${Number(metrics?.ai.estimated_cost ?? 0).toFixed(2)}`, variant: "green" },
  ];

  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-4">
        <h2 className="card-title">AI Hub Overview</h2>
        <span className="badge badge-indigo text-[9px]">RPC</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-2 rounded-xl border border-slate-100 bg-slate-50 text-center">
            <div className="text-lg font-black text-slate-800">
              {loading ? "..." : stat.value}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
        Accuracy and anomaly claims are hidden until model-evaluation
        instrumentation exists.
      </div>
      <a className="btn btn-secondary btn-sm w-full mt-4 font-black uppercase text-[9px] tracking-widest" href="/ai">
        Open AI Hub
      </a>
    </div>
  );
}
