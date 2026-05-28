import React from "react";
export default function CriticalAlerts() {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-3 text-xs">
      <div className="text-lg">⚠️</div>
      <div className="flex-1">
        <strong className="text-red-700">2 Critical Alerts:</strong> Admin MFA disabled (Anwar Sadat Mamudu) · API endpoint at 82% capacity.
        <div className="flex gap-2 mt-1">
          <button className="text-red-700 font-bold hover:underline">Fix MFA →</button>
          <button className="text-red-700 font-bold hover:underline">Security Center →</button>
        </div>
      </div>
      <span className="text-slate-500 whitespace-nowrap">May 15, 2026</span>
    </div>
  );
}
