"use client";

import React from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useModerateReview, useProviderReviews } from "../../data/useProviderTabs";

const ReviewsTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderReviews(providerId);
  const moderate = useModerateReview(providerId);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = (data?.data ?? []).filter((r) => !r.parent_id);
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        No reviews yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-800 dark:text-slate-200">{r.author_name ?? "Anonymous"}</span>
              {r.rating != null && (
                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600">
                  {r.rating.toFixed(1)} <Star className="h-3.5 w-3.5 fill-current" />
                </span>
              )}
              {r.is_verified_visit && <span className="badge badge-green">Verified visit</span>}
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
                  r.status === "approved"
                    ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
                    : r.status === "rejected"
                      ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30"
                      : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
                )}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.comment_text}</p>
            {r.created_at && (
              <div className="mt-1 text-3xs font-bold uppercase tracking-widest text-slate-400">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
          {r.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" disabled={moderate.isPending} onClick={() => moderate.mutate({ reviewId: r.id, status: "approved" })}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" disabled={moderate.isPending} onClick={() => moderate.mutate({ reviewId: r.id, status: "rejected" })}>
                Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewsTab;
