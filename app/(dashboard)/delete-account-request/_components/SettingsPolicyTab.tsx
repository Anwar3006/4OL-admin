import React from "react";

export default function SettingsPolicyTab() {
  return (
    <div className="space-y-6 mt-4">
      <div className="card">
        <h2 className="card-title text-sm mb-4">⚙️ Deletion Settings & Policy</h2>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs mb-1">GH-DPA 2012 Compliance</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Section 34 of the Ghana Data Protection Act 2012 requires that personal data be erased upon request within 30 days, 
              unless legal or regulatory obligations require retention.
            </p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-[11px] font-bold text-slate-600">Grace Period Duration</span>
            <span className="font-black text-slate-900">30 Days</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-[11px] font-bold text-slate-600">Auto-Verification (OTP)</span>
            <span className="text-ek-green font-black">ENABLED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
