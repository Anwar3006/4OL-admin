import React from "react";

export default function FeatureUsage({ loading }: { loading: boolean }) {
  return (
    <div className="card">
      <h2 className="card-title mb-4">Feature Usage</h2>
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        {loading
          ? "Checking instrumentation..."
          : "Feature usage needs an analytics event table before this chart can show real activity. No synthetic usage bars are rendered."}
      </div>
    </div>
  );
}
