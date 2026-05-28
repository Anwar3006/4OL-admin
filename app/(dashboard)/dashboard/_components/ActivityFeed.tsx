import React from "react";
const activities = [
  { title: "Admin MFA Disabled", tag: "CRITICAL", time: "2m ago", icon: "🔒" },
  { title: "API Rate Limit Warning", tag: "WARN", time: "8m ago", icon: "⚠️" },
  { title: "AI Flagged 3 Posts", tag: "AI", time: "12m ago", icon: "🤖" },
];
export default function ActivityFeed() {
  return (
    <div className="card">
      <h2 className="card-title mb-4">🟢 Live Platform Activity</h2>
      <div className="space-y-4">
        {activities.map((a, i) => (
          <div key={i} className="flex gap-3 text-xs">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">{a.icon}</div>
            <div>
              <div className="font-bold">{a.title} <span className="badge badge-red">{a.tag}</span></div>
              <div className="text-slate-500">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
