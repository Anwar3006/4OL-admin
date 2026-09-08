import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function HealthFeaturesStatus({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const features = [
    { label: "Conditions", status: `${metrics?.content.conditions ?? 0} records`, variant: "green" },
    { label: "Symptoms", status: `${metrics?.content.symptoms ?? 0} records`, variant: "green" },
    { label: "Fitness Exercises", status: `${metrics?.fitness.exercise_library ?? 0} published`, variant: "green" },
    { label: "Medication Reminders", status: "See module", variant: "blue" },
    { label: "Jobs Board", status: `${metrics?.operations.job_postings ?? 0} listings`, variant: "green" },
    { label: "BedTracker", status: `${metrics?.operations.available_beds ?? 0} beds available`, variant: metrics?.queues.active_bed_alerts ? "red" : "green" },
    { label: "FacilityScout", status: `${metrics?.operations.facility_scout_submissions ?? 0} submissions`, variant: "green" },
  ];

  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 dark:border-slate-800 mb-3">
        <h2 className="card-title text-sm">Health Features Status</h2>
      </div>
      <div className="space-y-0.5">
        {features.map((feature) => (
          <div key={feature.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold">
            <span className="text-slate-500">{feature.label}</span>
            <span className={`badge badge-${feature.variant} text-3xs`}>
              {loading ? "Loading" : feature.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
