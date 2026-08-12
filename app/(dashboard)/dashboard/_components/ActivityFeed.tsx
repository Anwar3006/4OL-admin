import React from "react";
import { PlatformOverviewMetrics } from "./dashboard-types";

export default function ActivityFeed({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const activities = metrics?.activity ?? [];

  return (
    <div className="card">
      <h2 className="card-title mb-4">Live Platform Activity</h2>
      <div className="space-y-4">
        {loading && <div className="text-xs text-slate-500">Loading activity...</div>}
        {!loading && activities.length === 0 && (
          <div className="text-xs text-slate-500">No recent activity logged.</div>
        )}
        {!loading &&
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                {activity.action_type?.slice(0, 1).toUpperCase() || "A"}
              </div>
              <div>
                <div className="font-bold text-slate-800">
                  {activity.action_type.replaceAll("_", " ")}
                  <span className="badge badge-blue ml-2">{activity.target_table}</span>
                </div>
                <div className="text-slate-500">
                  {activity.actor_name || "System"} ·{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(activity.created_at))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
