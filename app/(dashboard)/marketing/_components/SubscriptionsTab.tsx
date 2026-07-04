"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { subscriptionColumns } from "@/components/Data-Table/columns/subscriptionColumns";
import { useMarketingSubscriptions } from "@/hooks/supabase-calls/useMarketingSubscriptions";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function SubscriptionsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "subs_page" });
  const { data, isLoading } = useMarketingSubscriptions();
  const subs = data || [];

  const paginatedData = subs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(subs.length / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.plan_name || data.name,
      subtitle: (data) => data.billing_cycle || data.tier_type,
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'active' || data.payment_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
        }`}>
          {data.status || data.payment_status || 'active'}
        </span>
      ),
    },
    fields: [
      {
        id: "price",
        label: "Price",
        render: (data) => `${data.price}`,
      }
    ],
    actions: [
      { label: "View", onClick: (data) => console.log('View', data.id) },
    ]
  };

  return (
    <div className="space-y-4 mt-4">
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
          data={paginatedData}
          isLoading={isLoading}
          onRowClick={(row) => console.log('Row Click', row.id)}
          onDeleteSelected={(rows) => console.log('Delete Rows', rows)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            totalItems: subs.length,
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
