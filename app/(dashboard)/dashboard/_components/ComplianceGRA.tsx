import React from "react";

export default function ComplianceGRA({ loading }: { loading: boolean }) {
  const items = [
    { label: "Compliance settings", value: "Awaiting schema" },
    { label: "GRA Tax ID", value: "Not configured" },
    { label: "VAT filing status", value: "Awaiting transaction pipeline" },
    { label: "Security scan", value: "Awaiting monitoring source" },
    { label: "Encryption claim", value: "Not asserted here" },
  ];

  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3">
        <h2 className="card-title text-[13px]">Compliance & GRA</h2>
        <span className="badge badge-amber text-[9px]">Awaiting data</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold gap-4">
            <span className="text-slate-500">{item.label}</span>
            <span className="text-right text-slate-600">
              {loading ? "Loading" : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
