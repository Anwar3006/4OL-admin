"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  useFeedbackPosts,
  useModerateFeedback,
  useStaffReply,
  type FeedbackVisibility,
} from "../data/useFeedback";
import { cn } from "@/lib/utils";

// AF-02 — Moderation tab: pending queue + flagged/hidden posts. Approve
// publishes; hide removes from the board; approve-with-reset clears flags.

const CATEGORY_BADGE: Record<string, string> = {
  review: "bg-amber-50 text-amber-600 border-amber-200",
  suggestion: "bg-sky-50 text-sky-600 border-sky-200",
  recommendation: "bg-violet-50 text-violet-600 border-violet-200",
  bug: "bg-rose-50 text-rose-600 border-rose-200",
  praise: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const FILTERS: Array<{ id: FeedbackVisibility; label: string }> = [
  { id: "pending", label: "⏳ Pending" },
  { id: "hidden", label: "🚩 Flagged / Hidden" },
  { id: "published", label: "✅ Published" },
];

export default function ModerationTab() {
  const [visibility, setVisibility] = useState<FeedbackVisibility>("pending");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, isError, error } = useFeedbackPosts({ visibility });
  const moderate = useModerateFeedback();
  const reply = useStaffReply();

  const posts = data?.posts ?? [];

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setVisibility(f.id)}
            className={cn(
              "h-7 px-3 rounded-lg text-3xs font-black uppercase tracking-widest transition-all",
              visibility === f.id
                ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError ? (
        <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-3xl mb-3">💡</div>
          <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">
            Feedback board unavailable
          </p>
          <p className="text-xs font-medium text-slate-400 max-w-md mx-auto">
            Apply{" "}
            <code className="font-mono">20260926110000_af02_feedback_board.sql</code>{" "}
            to the live database to activate this tab.
          </p>
          <p className="text-2xs font-bold text-rose-400 mt-3">
            {(error as Error)?.message}
          </p>
        </div>
      ) : isLoading ? (
        <div className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          Nothing in this queue 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg border text-3xs font-black uppercase tracking-widest",
                        CATEGORY_BADGE[p.category] || CATEGORY_BADGE.suggestion,
                      )}
                    >
                      {p.category}
                    </span>
                    {p.module && (
                      <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest">
                        {p.module}
                      </span>
                    )}
                    {p.flag_count > 0 && (
                      <span className="text-3xs font-black text-rose-500">
                        🚩 {p.flag_count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">
                    {p.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-3">
                    {p.body}
                  </p>
                  <p className="text-3xs text-slate-400 font-bold uppercase tracking-widest mt-2">
                    {p.is_anonymous ? "Anonymous" : "User"} · ▲ {p.vote_count} ·{" "}
                    {format(new Date(p.created_at), "dd MMM yyyy")}
                    {p.app_version ? ` · v${p.app_version}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.visibility !== "published" && (
                    <button
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({
                          postId: p.id,
                          visibility: "published",
                          resetFlags: true,
                        })
                      }
                      className="h-8 px-3 rounded-lg text-3xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      ✅ Approve
                    </button>
                  )}
                  {p.visibility !== "hidden" && (
                    <button
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ postId: p.id, visibility: "hidden" })
                      }
                      className="h-8 px-3 rounded-lg text-3xs font-black uppercase tracking-widest border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      🚩 Hide
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setReplyFor(replyFor === p.id ? null : p.id)
                    }
                    className="h-8 px-3 rounded-lg text-3xs font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    💬 Reply
                  </button>
                </div>
              </div>

              {replyFor === p.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Reply as 4 Our Life Team…"
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    disabled={reply.isPending || !replyBody.trim()}
                    onClick={() => {
                      reply.mutate({ postId: p.id, body: replyBody });
                      setReplyBody("");
                      setReplyFor(null);
                    }}
                    className="h-9 px-4 rounded-xl text-3xs font-black uppercase tracking-widest bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-40 transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
