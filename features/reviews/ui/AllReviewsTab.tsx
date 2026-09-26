"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { reviewColumns } from "./reviewColumns";
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
  useFacilityRatingsList,
  useDeleteFacilityReview,
} from "@/features/reviews/data/useReviews";
import ReviewDetailDialog from "./view-review-dialog";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { Star } from "lucide-react";

interface ReviewsDataTabProps {
  status?: "pending" | "approved" | "rejected";
}

export default function ReviewsDataTab({ status }: ReviewsDataTabProps) {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: `reviews_${status || "all"}_page` });
  const [search, setSearch] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const deleteReview = useDeleteFacilityReview();

  const { data, isLoading, isError, error } = useFacilityRatingsList({
    pageIndex: page,
    pageSize: pageSize,
    search: search,
    status,
  });

  const rows = (data?.ratings || []) as any[];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleViewReview = (review: any) => setSelectedReviewId(review.id);

  // No dedicated edit form exists yet; opening the comprehensive detail modal
  // keeps the action meaningful instead of a dead console.log stub.
  const handleEditReview = (review: any) => setSelectedReviewId(review.id);

  const handleDeleteReview = (review: any) => deleteReview.mutate(review.id);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.user_profiles?.name || "Anonymous",
      subtitle: (data) => data.facility_profile?.facility_name || "N/A",
      badge: (data) => (
        <span className="flex items-center gap-1 text-2xs font-black text-amber-500">
          {data.rating} <Star className="h-3 w-3 fill-amber-500" />
        </span>
      ),
    },
    fields: [
      {
        id: "comment",
        render: (data) => data.comment_text,
        className: "italic text-xs",
      },
    ],
    actions: [
      { label: "View Details", onClick: (data) => handleViewReview(data) },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="h-9 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          📥 Export Data
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={reviewColumns.map((col) => {
            if (col.id === "actions") {
              return {
                ...col,
                cell: ({ row }: any) => {
                  const review = row.original;
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReview(review);
                        }}
                      >
                        👁️
                      </button>
                      <button
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReview(review);
                        }}
                      >
                        ✏️
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            🗑️
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReview(review);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                },
              };
            }
            return col;
          })}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => setSelectedReviewId(row.id)}
          onDeleteSelected={(rows) => rows.forEach((r) => deleteReview.mutate(r.id))}
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
      </div>

      <ReviewDetailDialog
        reviewId={selectedReviewId}
        open={!!selectedReviewId}
        onClose={() => setSelectedReviewId(null)}
      />
    </div>
  );
}
