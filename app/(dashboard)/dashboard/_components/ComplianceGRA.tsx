import React from "react";
const items = [
  { label: "Ghana Data Protection Act", value: "GH-DPA 2012", variant: "green" },
  { label: "GRA Tax ID", value: "C0042819876", mono: true },
  { label: "VAT Rate (Effective)", value: "17.5%" },
  { label: "Q2 VAT Filing (Jun)", value: "Due Jun 30", variant: "amber" },
  { label: "Last Security Scan", value: "May 7, 2026", color: "text-ek-green-dark" },
  { label: "Encryption", value: "AES-256 · TLS 1.3" },
];
export default function ComplianceGRA() {
  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3">
        <h2 className="card-title text-[13px]">⚖️ Compliance & GRA</h2>
        <span className="badge badge-green text-[9px]">✅ Compliant</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold">
            <span className="text-slate-500">{item.label}</span>
            <span className={`${item.mono ? 'font-mono' : ''} ${item.color || ''}`}>
              {item.variant ? <span className={`badge badge-${item.variant} text-[9px]`}>{item.value}</span> : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
