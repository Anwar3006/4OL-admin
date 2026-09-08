import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function CriticalAlerts({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const openThreats = metrics?.queues.open_security_threats ?? 0;
  const bedAlerts = metrics?.queues.active_bed_alerts ?? 0;
  const moderation = metrics?.queues.pending_moderation_flags ?? 0;
  const total = openThreats + bedAlerts + moderation;

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-4 text-xs text-slate-500">
        Checking operational queues...
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 rounded-lg p-3 mb-4 text-xs">
        <strong className="text-emerald-700 dark:text-emerald-400">No critical dashboard alerts.</strong>{" "}
        Security, BedTracker, and moderation queues are clear.
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3 text-xs">
      <div className="text-lg">!</div>
      <div className="flex-1">
        <strong className="text-amber-700 dark:text-amber-400">{total} queue items need review:</strong>{" "}
        {openThreats} security threats · {bedAlerts} bed alerts · {moderation} moderation flags
        <div className="flex gap-2 mt-1">
          <a href="/security" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">Security Center</a>
          <a href="/bed-tracker" className="text-amber-700 dark:text-amber-400 font-bold hover:underline">BedTracker</a>
        </div>
      </div>
    </div>
  );
}
