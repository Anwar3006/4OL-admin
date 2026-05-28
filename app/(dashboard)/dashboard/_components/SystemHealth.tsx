import React from "react";
const metrics = [
  { label: "API Response", value: "98ms ✓", color: "text-ek-green-dark" },
  { label: "DB Latency", value: "12ms ✓", color: "text-ek-green-dark" },
  { label: "Uptime (30d)", value: "99.94%", color: "text-ek-green-dark" },
  { label: "Active Sessions", value: "3,214", color: "text-ek-blue" },
  { label: "Firebase FCM", value: "✅ Connected", color: "text-ek-green-dark" },
];
export default function SystemHealth() {
  return (
    <div className="card">
      <h2 className="card-title mb-4">🖥️ System Health</h2>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex justify-between text-xs font-medium">
            <span className="text-slate-500">{m.label}</span>
            <span className={`font-bold ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
