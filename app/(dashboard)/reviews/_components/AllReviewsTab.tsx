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
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: `reviews_${status || 'all'}_page` });
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
      { id: "comment", render: (data) => data.comment_text, className: "italic text-[11px]" },
    ],
    actions: [
      { label: "View Details", onClick: (data) => console.log('View', data.id) },
    ]
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
          columns={reviewColumns}
          data={rows}
          isLoading={isLoading}
          onRowClick={(row) => console.log('Row Click', row.id)}
          onDeleteSelected={(rows) => console.log('Delete Rows', rows)}
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
