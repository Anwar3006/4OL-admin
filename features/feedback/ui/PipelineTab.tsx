"use client";

import React from "react";
import {
  useFeedbackPosts,
  useSetFeedbackStatus,
  type FeedbackStatus,
} from "../data/useFeedback";
import { cn } from "@/lib/utils";

// AF-02 — Pipeline tab: kanban columns by status. Moving a card writes
// status_changed_by/at server-side and fires watcher push notifications.

const COLUMNS: Array<{ id: FeedbackStatus; label: string; accent: string }> = [
  { id: "open", label: "Open", accent: "border-slate-300" },
  { id: "under_review", label: "Under Review", accent: "border-sky-300" },
  { id: "planned", label: "Planned", accent: "border-violet-300" },
  { id: "in_progress", label: "In Progress", accent: "border-amber-300" },
  { id: "shipped", label: "Shipped", accent: "border-emerald-300" },
  { id: "closed", label: "Closed", accent: "border-slate-200" },
];

const ORDER: FeedbackStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "closed",
];

export default function PipelineTab() {
  const { data, isLoading, isError } = useFeedbackPosts({
    visibility: "published",
    limit: 500,
  });
  const setStatus = useSetFeedbackStatus();

  const posts = data?.posts ?? [];
  const byStatus = (s: FeedbackStatus) =>
    posts.filter((p) => p.status === s).sort((a, b) => b.vote_count - a.vote_count);

  const move = (id: string, current: FeedbackStatus, dir: 1 | -1) => {
    const idx = ORDER.indexOf(current);
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, idx + dir))];
    if (next !== current) setStatus.mutate({ postId: id, status: next });
  };

  if (isError) {
    return (
      <div className="p-10 text-center text-xs font-bold text-rose-400 mt-4">
        Pipeline unavailable — apply the AF-02 feedback_board migration.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mt-4">
      {isLoading ? (
        <div className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {COLUMNS.map((col) => {
            const items = byStatus(col.id);
            return (
              <div
                key={col.id}
                className={cn(
                  "rounded-2xl border-t-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 p-2 min-h-[160px]",
                  col.accent,
                )}
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-3xs font-black uppercase tracking-widest text-slate-500">
                    {col.label}
                  </span>
                  <span className="text-3xs font-black text-slate-400">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-sm"
                    >
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
                        {p.title}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-3xs font-black text-emerald-600">
                          ▲ {p.vote_count}
                        </span>
                        <div className="flex gap-1">
                          <button
                            disabled={setStatus.isPending}
                            onClick={() => move(p.id, p.status, -1)}
                            className="h-6 w-6 rounded-md text-3xs font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Move back"
                          >
                            ◀
                          </button>
                          <button
                            disabled={setStatus.isPending}
                            onClick={() => move(p.id, p.status, 1)}
                            className="h-6 w-6 rounded-md text-3xs font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Advance"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-3xs text-slate-300 dark:text-slate-600 text-center py-4 font-bold uppercase tracking-widest">
                      Empty
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
