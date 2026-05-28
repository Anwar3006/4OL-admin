import React from "react";
const regions = [
  { name: "Greater Accra", data: "482 facilities · 18,240 users", color: "text-ek-green-dark" },
  { name: "Ashanti", data: "248 facilities · 9,820 users", color: "text-ek-blue" },
  { name: "Western", data: "124 facilities · 4,210 users", color: "text-ek-teal" },
  { name: "Central", data: "98 facilities · 3,840 users", color: "text-ek-gold" },
  { name: "Northern Regions", data: "84 facilities · 2,120 users", color: "text-red-500", warning: true },
];
export default function RegionalCoverage() {
  return (
    <div className="card">
      <div className="card-header mb-4">
        <h2 className="card-title">🗺️ Regional Coverage</h2>
        <span className="text-ek-green text-[11px] font-black uppercase tracking-widest cursor-pointer hover:underline">Full Map →</span>
      </div>
      <div className="space-y-2">
        {regions.map((r, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold">
            <span className="text-slate-500">{r.name}</span>
            <span className={`text-[10px] ${r.color}`}>{r.data} {r.warning && '⚠️ Low'}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-32 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
        Interactive Map Visualization
      </div>
    </div>
  );
}
