"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { reviewColumns } from "@/components/Data-Table/columns/reviewColumns";
import { useFacilityRatingsList } from "@/hooks/supabase-calls/useReviews";
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

  const { data, isLoading } = useFacilityRatingsList({
    pageIndex: page,
    pageSize: pageSize,
    search: search,
    status,
  });

  const rows = (data?.ratings || []) as any[];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleViewReview = (review: any) => {
    console.log("View review:", review.id);
    // Add view dialog logic here if needed
  };

  const handleEditReview = (review: any) => {
    console.log("Edit review:", review.id);
    // Add edit dialog logic here if needed
  };

  const handleDeleteReview = (review: any) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      console.log("Delete review:", review.id);
      // Add delete mutation here if needed
    }
  };

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.user_profiles?.name || "Anonymous",
      subtitle: (data) => data.facility_profile?.facility_name || "N/A",
      badge: (data) => (
        <span className="flex items-center gap-1 text-[10px] font-black text-amber-500">
          {data.rating} <Star className="h-3 w-3 fill-amber-500" />
        </span>
      ),
    },
    fields: [
      {
        id: "comment",
        render: (data) => data.comment_text,
        className: "italic text-[11px]",
      },
    ],
    actions: [
      { label: "View Details", onClick: (data) => handleViewReview(data) },
    ],
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export Data
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
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
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReview(review);
                        }}
                      >
                        👁️
                      </button>
                      <button
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReview(review);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReview(review);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                },
              };
            }
            return col;
          })}
          data={rows}
          isLoading={isLoading}
          onRowClick={(row) => console.log("Row Click", row.id)}
          onDeleteSelected={(rows) => console.log("Delete Rows", rows)}
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
    </div>
  );
}
