"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { subscriptionColumns } from "@/components/Data-Table/columns/subscriptionColumns";
import { useMarketingSubscriptions } from "@/hooks/supabase-calls/useSubscriptions";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function SubscriptionsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "subs_page" });
  const { data, isLoading, isError, error } = useMarketingSubscriptions({
    page,
    limit: pageSize,
  });
  const subs = data?.data || [];

  const totalPages = data?.meta?.totalPages || 1;

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.name || data.plan_name,
      subtitle: (data) =>
        data.billingCycle || data.billing_cycle || data.tierType,
      badge: (data) => (
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            data.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}
        >
          {data.isActive ? "active" : "inactive"}
        </span>
      ),
    },
    fields: [
      {
        id: "price",
        label: "Price",
        render: (data) => `${data.price}`,
      },
    ],
    actions: [
      { label: "View", onClick: (data) => console.log("View", data.id) },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search subscribers..."
        />
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export List
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={subscriptionColumns}
          data={subs}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => console.log("Row Click", row.id)}
          onDeleteSelected={(rows) => console.log("Delete Rows", rows)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: data?.meta?.total || 0,
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
