"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { topRatedItemColumns } from "@/components/Data-Table/columns/topRatedColumns";
import { useTopRatedItems } from "@/hooks/supabase-calls/useTopRatedItems";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { TOP_RATED_MODULES } from "@/schemas/top-rated.schema";

interface TopRatedItemsTableProps {
  module?: string;
}

const TopRatedItemsTable: React.FC<TopRatedItemsTableProps> = ({ module }) => {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({
      key: `top-rated-${module || "all"}-page`,
    });
  const { data, isLoading, isError, error } = useTopRatedItems({
    page,
    limit: pageSize,
    module,
  });

  const items = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (row) => row.title,
      subtitle: (row) => row.subtitle || `Module: ${row.module}`,
      badge: (row) => (
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            row.source === "subscription"
              ? "bg-purple-50 text-purple-700 border-purple-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          {row.source === "subscription" ? "💎 Subscription" : "📝 Manual"}
        </span>
      ),
    },
    fields: [
      {
        id: "rating",
        label: "Rating",
        render: (row) =>
          row.rating
            ? `⭐ ${row.rating.toFixed(1)} (${row.rating_count})`
            : "—",
      },
      {
        id: "rank",
        label: "Rank",
        render: (row) => (row.rank ? `#${row.rank}` : "—"),
      },
    ],
    actions: [
      {
        label: "View",
        onClick: (row) => console.log("View", row.id),
      },
    ],
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search top-rated items..."
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={topRatedItemColumns}
          data={items}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => console.log("Row Click", row.id)}
          onDeleteSelected={(rows) => console.log("Delete Rows", rows)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: items.length,
            pageSize,
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
};

export default TopRatedItemsTable;
