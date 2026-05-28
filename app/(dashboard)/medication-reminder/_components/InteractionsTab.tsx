import React from "react";

export default function InteractionsTab() {
  return (
    <div className="card mt-4 py-20 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <h3 className="text-lg font-black text-slate-800">
          Drug Interactions
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Monitor and manage critical drug-to-drug and drug-to-food interaction warnings.
        </p>
        <div className="flex justify-center gap-2">
          <span className="badge badge-amber uppercase">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
