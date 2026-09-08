"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/Data-Table/data-table";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import KpiCard from "@/components/redesign/KpiCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useAppReviewKpiStats,
  useAppReviewsList,
  useModerateAppReview,
} from "@/features/reviews/data/useAppReviews";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

// Part AC — App Reviews tab (mockup Target: "App", admin-panel.html L6674–6767).
// Feeds on the periodic in-app rating popup pipeline (app_reviews table +
// submit_app_review RPC). Unlike the facility tabs, moderation actions here
// are REAL mutations — admin_moderate_app_review RPC.

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200",
  approved: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200",
  rejected: "bg-rose-50 text-rose-600 border-rose-200",
};

const PLATFORM_BADGES: Record<string, string> = {
  ios: "🍎 iOS",
  android: "🤖 Android",
  web: "🌐 Web",
};

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-2.5 w-2.5",
          i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200",
        )}
      />
    ))}
  </div>
);

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "⏳ Pending" },
  { id: "approved", label: "✅ Approved" },
  { id: "rejected", label: "🚩 Rejected" },
];

export default function AppReviewsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "app_reviews_page" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const status =
    statusFilter === "all"
      ? undefined
      : (statusFilter as "pending" | "approved" | "rejected");

  const { data, isLoading, isError, error } = useAppReviewsList({
    pageIndex: page,
    pageSize,
    search,
    status,
  });
  const { data: kpi } = useAppReviewKpiStats();
  const moderate = useModerateAppReview();

  const rows = (data?.reviews || []) as any[];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "reviewer",
        header: "Reviewer",
        cell: ({ row }) => (
          <div>
            <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
              {row.original.user_profiles?.name || "Anonymous"}
            </div>
            <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
              {row.original.prompt_source === "settings_manual"
                ? "Settings menu"
                : "Periodic popup"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <RatingStars rating={row.original.rating} />,
      },
      {
        accessorKey: "comment_text",
        header: "Feedback",
        cell: ({ row }) => (
          <div className="max-w-[240px]">
            <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-tight italic">
              {row.original.comment_text || "— no comment —"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "app_version",
        header: "App Info",
        cell: ({ row }) => (
          <div>
            <div className="text-2xs font-black text-slate-600 dark:text-slate-300 leading-none mb-1">
              {PLATFORM_BADGES[row.original.platform] || "📱 App"}
            </div>
            <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
              {row.original.app_version ? `v${row.original.app_version}` : "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "px-2 py-1 rounded-lg border text-3xs font-black uppercase tracking-widest",
              STATUS_STYLES[row.original.status] || STATUS_STYLES.pending,
            )}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
            {row.original.created_at
              ? format(new Date(row.original.created_at), "dd MMM yyyy")
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const review = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              {review.status !== "approved" && (
                <button
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
                  title="Approve"
                  disabled={moderate.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    moderate.mutate({ reviewId: review.id, status: "approved" });
                  }}
                >
                  ✅
                </button>
              )}
              {review.status !== "rejected" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Reject"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🚩
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject this app review?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This hides the review from any public surface and marks
                        it rejected. The user is not notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          moderate.mutate({
                            reviewId: review.id,
                            status: "rejected",
                          });
                        }}
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        },
      },
    ],
    [moderate],
  );

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.user_profiles?.name || "Anonymous",
      subtitle: (data) =>
        `${PLATFORM_BADGES[data.platform] || "App"}${data.app_version ? ` · v${data.app_version}` : ""}`,
      badge: (data) => (
        <span className="flex items-center gap-1 text-2xs font-black text-amber-500">
          {data.rating} <Star className="h-3 w-3 fill-amber-500" />
        </span>
      ),
    },
    fields: [
      {
        id: "comment",
        render: (data) => data.comment_text || "— no comment —",
        className: "italic text-xs",
      },
    ],
    actions: [
      {
        label: "Approve",
        onClick: (data) =>
          moderate.mutate({ reviewId: data.id, status: "approved" }),
      },
      {
        label: "Reject",
        onClick: (data) =>
          moderate.mutate({ reviewId: data.id, status: "rejected" }),
      },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* KPI strip — app-review-specific stats (separate from facility KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon="📱"
          label="App Reviews"
          value={kpi ? kpi.total_reviews.toLocaleString() : "..."}
          variant="blue"
          delta={
            kpi?.total_delta === null || kpi?.total_delta === undefined
              ? "No prior month"
              : `${kpi.total_delta > 0 ? "+" : ""}${kpi.total_delta}% this month`
          }
          deltaType={
            (kpi?.total_delta ?? 0) > 0
              ? "up"
              : (kpi?.total_delta ?? 0) < 0
                ? "down"
                : "neutral"
          }
        />
        <KpiCard
          icon="⭐"
          label="Avg Rating"
          value={kpi ? kpi.average_rating.toFixed(1) : "..."}
          variant="teal"
          delta="All-time"
          deltaType="neutral"
        />
        <KpiCard
          icon="⏳"
          label="Pending"
          value={kpi ? kpi.pending_reviews.toLocaleString() : "..."}
          variant="gold"
          delta="Awaiting moderation"
          deltaType="neutral"
        />
        <KpiCard
          icon="⚠️"
          label="Low Ratings (≤2★)"
          value={kpi ? kpi.low_rating_reviews.toLocaleString() : "..."}
          variant="red"
          delta="Support follow-up pool"
          deltaType="neutral"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search feedback..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setStatusFilter(f.id);
                onPageChange(1);
              }}
              className={cn(
                "h-7 px-3 rounded-lg text-3xs font-black uppercase tracking-widest transition-all",
                statusFilter === f.id
                  ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {isError ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-3">📱</div>
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">
              App reviews unavailable
            </p>
            <p className="text-xs font-medium text-slate-400 max-w-md mx-auto">
              The <code className="font-mono">app_reviews</code> migration has
              not been applied yet (or the RPC is missing). Apply{" "}
              <code className="font-mono">20260822_app_reviews.sql</code> to
              the live database to activate this tab.
            </p>
            <p className="text-2xs font-bold text-rose-400 mt-3">
              {(error as Error)?.message}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            isError={false}
            error={null}
            cardConfig={cardConfig}
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: totalCount,
              pageSize: pageSize,
              onPageChange,
              onNextPage,
              onPreviousPage,
              canNextPage: page < totalPages,
              canPreviousPage: page > 1,
            }}
          />
        )}
      </div>
    </div>
  );
}
