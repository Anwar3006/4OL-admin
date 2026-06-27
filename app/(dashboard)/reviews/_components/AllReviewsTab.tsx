"use client";

import React, { useState } from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Flag, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useFacilityRatingsList } from "@/hooks/supabase-calls/useReviews";

export interface ReviewRow {
  id: string;
  user_profiles?: { name: string; email?: string };
  facility_profile?: { facility_name: string };
  rating: number;
  comment_text: string;
  status?: "pending" | "approved" | "rejected" | string;
  created_at: string;
  [key: string]: any;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "✅ Approved", className: "badge badge-green" },
  pending: { label: "⏳ Pending", className: "badge badge-amber" },
  rejected: { label: "🚩 Flagged", className: "badge badge-red" },
};

interface ReviewsDataTabProps {
  /** Filter applied server-side; omit to show all statuses ("All Reviews" tab) */
  status?: "pending" | "approved" | "rejected";
}

const PAGE_SIZE = 10;

export default function ReviewsDataTab({ status }: ReviewsDataTabProps) {
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useFacilityRatingsList({
    pageIndex,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    status,
  });

  const rows = (data?.ratings || []) as ReviewRow[];
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageIndex(1); // reset to first page on new search
  };

  const columns: Column<ReviewRow>[] = [
    { key: "reviewer", label: "Reviewer", render: (val, row) => (
        <div><div className="font-bold text-slate-800">{row.user_profiles?.name || "Anonymous"}</div><div className="text-[10px] text-slate-400">ID: {row.id}</div></div>
    )},
    { key: "target", label: "Target", render: (val, row) => (
        <div><div className="font-bold text-slate-800">{row.facility_profile?.facility_name || "N/A"}</div></div>
    )},
    { key: "rating", label: "Rating", render: (val, row) => <span className="text-ek-gold font-bold">{row.rating} ⭐</span> },
    { key: "comment_text", label: "Review Excerpt", render: (val, row) => <div className="text-[11px] text-slate-600 max-w-[200px] truncate">{row.comment_text}</div> },
    { key: "created_at", label: "Date", render: (val, row) => <span className="text-[10px] font-bold text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span> },
    { key: "status", label: "Status", render: (val, row) => {
        const badge = STATUS_BADGE[row.status || "approved"] || STATUS_BADGE.approved;
        return <span className={badge.className}>{badge.label}</span>;
    }},
  ];

  const rowActions: RowAction<ReviewRow>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: () => {} },
    { label: "Flag", icon: <Flag className="w-4 h-4" />, onClick: () => {} },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {} },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input 
            className="flex-1 min-w-[240px] h-8 pl-3 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none transition-all" 
            placeholder="🔍 Search by reviewer, facility, content..." 
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Ratings</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-x-auto border border-slate-200 shadow-sm rounded-xl">
        <DataTable
          columns={columns}
          data={rows}
          selectable
          rowActions={rowActions}
          isLoading={isLoading}
          pagination
          externalPage={pageIndex}
          externalTotalPages={totalPages}
          onPageChange={setPageIndex}
        />
      </div>
    </div>
  );
}
