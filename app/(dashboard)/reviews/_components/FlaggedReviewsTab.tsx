import React from "react";

export default function FlaggedReviewsTab() {
  return (
    <div className="card mt-4 py-20 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">🚩</div>
        <h3 className="text-lg font-black text-slate-800">Flagged Reviews</h3>
        <p className="text-xs text-slate-500 font-medium">Reviews that have been flagged by users or AI for inappropriate content, spam, or misinformation. Requires moderation.</p>
        <div className="flex justify-center gap-2"><span className="badge badge-red uppercase">Needs Moderation</span></div>
      </div>
    </div>
  );
}
