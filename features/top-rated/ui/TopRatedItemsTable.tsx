"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/Data-Table/data-table";
import { topRatedItemColumns } from "./topRatedColumns";
import {
  useRemoveTopRatedItem,
  useTopRatedItems,
} from "@/features/top-rated/data/useTopRatedItems";
import { usePagination } from "@/hooks/use-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { toast } from "sonner";

interface TopRatedItemsTableProps {
  module?: string;
}

type WindowFilter = "all" | "active" | "scheduled" | "expired";

const getModuleDeepLink = (module: string): string => {
  const routes: Record<string, string> = {
    facility: "/facilities",
    outdoor_route: "/fitness?tab=outdoor",
    outdoor_event: "/fitness?tab=outdoor",
    challenge: "/fitness?tab=challenges",
    exercise: "/fitness?tab=exercises",
    fitness_plan: "/fitness?tab=plans",
  };
  return routes[module] || "/top-rated";
};

const TopRatedItemsTable: React.FC<TopRatedItemsTableProps> = ({ module }) => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [windowStatus, setWindowStatus] = useState<WindowFilter>("all");
  const debouncedSearch = useDebounce(search, 300);
  const { mutate: removeItem } = useRemoveTopRatedItem();

  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({
      key: `top-rated-${module || "all"}-page`,
    });
  const { data, isLoading, isError, error } = useTopRatedItems({
    page,
    limit: pageSize,
    module,
    search: debouncedSearch.trim() || undefined,
    windowStatus,
  });

  const items = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  const handleDeleteSelected = (rows: any[]) => {
    if (!rows.length) return;
    Promise.all(
      rows
        .filter((row) => row.source !== "subscription")
        .map(
          (row) =>
            new Promise<void>((resolve) =>
              removeItem(
                { module: row.module, item_id: row.item_id },
                { onSettled: () => resolve() },
              ),
            ),
        ),
    ).then(() => {
      toast.success(`Removed ${rows.length} top-rated item(s)`);
    });
  };

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (row) => row.title,
      subtitle: (row) => row.subtitle || `Module: ${row.module}`,
      badge: (row) => (
        <span
          className={`text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            row.source === "subscription"
              ? "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/30"
              : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
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
        onClick: (row) => router.push(getModuleDeepLink(row.module)),
      },
    ],
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search top-rated items..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onPageChange(1);
          }}
        />
        {/* Gap Analysis T-D2 — placement-window filter */}
        <select
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white dark:bg-slate-800"
          value={windowStatus}
          onChange={(e) => {
            setWindowStatus(e.target.value as WindowFilter);
            onPageChange(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={topRatedItemColumns}
          data={items}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => router.push(getModuleDeepLink(row.module))}
          onDeleteSelected={handleDeleteSelected}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: data?.meta?.total || 0,
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
