import React from "react";
const features = [
  { label: "AI Symptom Checker", value: "284,200", pct: 100, color: "bg-ek-indigo" },
  { label: "Facility Search", value: "198,400", pct: 70, color: "bg-ek-teal" },
  { label: "Period Tracker", value: "142,800", pct: 50, color: "bg-pink-500" },
];
export default function FeatureUsage() {
  return (
    <div className="card">
      <h2 className="card-title mb-4">📊 Feature Usage (30d)</h2>
      <div className="space-y-3">
        {features.map((f) => (
          <div key={f.label}>
            <div className="flex justify-between text-xs mb-1"><span>{f.label}</span><b className="text-slate-800">{f.value}</b></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${f.color}`} style={{ width: `${f.pct}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
