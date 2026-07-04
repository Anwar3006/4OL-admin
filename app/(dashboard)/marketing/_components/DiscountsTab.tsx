"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { discountColumns } from "@/components/Data-Table/columns/discountColumns";
import { useMarketingDiscounts } from "@/hooks/supabase-calls/useMarketingDiscounts";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function DiscountsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "discounts_page" });
  const { data, isLoading } = useMarketingDiscounts();
  const discounts = data || [];

  const paginatedData = discounts.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(discounts.length / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.code,
      subtitle: (data) => data.description,
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {data.status || 'active'}
        </span>
      ),
    },
    fields: [
      {
        id: "value",
        label: "Value",
        render: (data) => `${data.discount_value}${data.discount_type === 'percentage' ? '%' : ' OFF'}`,
      }
    ],
    actions: [
      { label: "Edit", onClick: (data) => console.log('Edit', data.id) },
    ]
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search promo codes..."
        />
        <button className="h-9 px-4 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all">
          + Create Code
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={discountColumns}
          data={paginatedData}
          isLoading={isLoading}
          onRowClick={(row) => console.log('Row Click', row.id)}
          onDeleteSelected={(rows) => console.log('Delete Rows', rows)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            totalItems: discounts.length,
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
