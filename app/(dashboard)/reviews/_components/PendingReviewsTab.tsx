import React from "react";

export default function PendingReviewsTab() {
  return (
    <div className="card mt-4 py-20 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">⏳</div>
        <h3 className="text-lg font-black text-slate-800">Pending Reviews</h3>
        <p className="text-xs text-slate-500 font-medium">Reviews submitted that require manual approval before being visible to the public.</p>
        <div className="flex justify-center gap-2"><span className="badge badge-amber uppercase">Awaiting Approval</span></div>
      </div>
    </div>
  );
}
