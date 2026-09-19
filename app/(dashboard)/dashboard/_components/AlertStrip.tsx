import React from "react";
import { cn } from "@/lib/utils";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function AlertStrip({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const openThreats = metrics?.queues.open_security_threats ?? 0;
  const bedAlerts = metrics?.queues.active_bed_alerts ?? 0;
  const moderation = metrics?.queues.pending_moderation_flags ?? 0;
  const pendingFacilities = metrics?.queues.pending_facilities ?? 0;
  const total = openThreats + bedAlerts + moderation;

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-500">
        Checking operational queues...
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-4 py-2.5 text-xs">
        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
        <strong className="text-emerald-700 dark:text-emerald-400">No critical dashboard alerts.</strong>
        <span className="text-slate-500 dark:text-slate-400">
          Security, BedTracker, and moderation queues are clear.
        </span>
      </div>
    );
  }

  // Real security threats read as a harder signal than the other two queues
  // — a genuine "crit" state, not just "amber, go look eventually".
  const isCritical = openThreats > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 text-xs",
        isCritical
          ? "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15"
          : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15",
      )}
    >
      <span className={cn("size-2 rounded-full shrink-0", isCritical ? "bg-red-500" : "bg-amber-500")} />
      <strong className={isCritical ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
        {openThreats > 0 && `${openThreats} open security threat${openThreats === 1 ? "" : "s"}`}
      </strong>
      <span className="flex-1 min-w-0 text-slate-500 dark:text-slate-400">
        {[
          bedAlerts > 0 && `${bedAlerts} bed alert${bedAlerts === 1 ? "" : "s"}`,
          moderation > 0 && `${moderation} moderation flag${moderation === 1 ? "" : "s"}`,
          pendingFacilities > 0 && `${pendingFacilities} facilities pending approval`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <a
        href={isCritical ? "/security" : "/facilities?status=pending"}
        className={cn(
          "font-bold whitespace-nowrap hover:underline",
          isCritical ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400",
        )}
      >
        Review →
      </a>
    </div>
  );
}
