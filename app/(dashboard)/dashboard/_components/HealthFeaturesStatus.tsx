import React from "react";
const features = [
  { label: "📅 Period Tracker", status: "Staging · Phase 4", variant: "amber" },
  { label: "🦴 Anatomy Body Map", status: "Live · 312 parts", variant: "green" },
  { label: "💼 Jobs Board", status: "Live · 84 listings", variant: "green" },
  { label: "📲 FacilityScout", status: "Live · 4,821 scouts", variant: "green" },
  { label: "💊 Medication Enquiry", status: "Live · 8 pending", variant: "green" },
  { label: "🛏️ BedTracker (PKM)", status: "LIVE · Critical", variant: "red" },
  { label: "🏋️ Fitness Tracker", status: "Live · AI v2", variant: "green" },
];
export default function HealthFeaturesStatus() {
  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3"><h2 className="card-title text-[13px]">🏥 Health Features Status</h2></div>
      <div className="space-y-0.5">
        {features.map((f, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold">
            <span className="text-slate-500">{f.label}</span>
            <span className={`badge badge-${f.variant} text-[9px]`}>{f.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
