import React from "react";
const streams = [
  { label: "User Subscriptions", value: "₵112,450", pct: 78, color: "bg-ek-green" },
  { label: "Provider Plans", value: "₵68,200", pct: 47, color: "bg-ek-blue" },
  { label: "Transaction Fees", value: "₵45,800", pct: 32, color: "bg-ek-teal" },
  { label: "Enterprise Wellness", value: "₵24,000", pct: 17, color: "bg-ek-purple" },
  { label: "Jobs Premium", value: "₵9,280", pct: 6, color: "bg-ek-gold" },
];
export default function RevenueStreams() {
  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">💰 Revenue Streams (MTD)</h2><span className="font-bold text-ek-green">₵287,650</span></div>
      <div className="space-y-3">
        {streams.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1"><span>{s.label}</span><b className="text-slate-800">{s.value}</b></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
