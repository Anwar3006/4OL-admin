import React from "react";

const stats = [
  { label: "Active Models", value: "8", color: "text-ek-indigo", bg: "bg-ek-indigo/5" },
  { label: "Pending Flags", value: "23", color: "text-red-500", bg: "bg-red-50" },
  { label: "Avg Accuracy", value: "94.2%", color: "text-ek-green-dark", bg: "bg-ek-green/5" },
  { label: "Anomaly Alerts", value: "2", color: "text-ek-gold", bg: "bg-ek-gold/5" },
];

export default function AIHubOverview() {
  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-4">
        <h2 className="card-title">🤖 AI Hub Overview</h2>
        <span className="badge badge-indigo text-[9px]">Live</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((s, i) => (
          <div key={i} className={`p-2 rounded-xl border border-slate-100 ${s.bg} text-center`}>
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-slate-500 font-medium">Symptom Checker</span>
          <span className="text-ek-green-dark">96.4% 🎯</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-slate-500 font-medium">Period Predictor</span>
          <span className="text-ek-gold font-black">94.6% · Staging</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-slate-500 font-medium">Drug Interaction</span>
          <span className="text-ek-green-dark">98.1% 🎯</span>
        </div>
      </div>
      <button className="btn btn-secondary btn-sm w-full mt-4 font-black uppercase text-[9px] tracking-widest">
        🤖 Open AI Hub →
      </button>
    </div>
  );
}
