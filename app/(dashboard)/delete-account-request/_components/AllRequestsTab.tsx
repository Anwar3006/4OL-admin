"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { deleteAccountColumns } from "@/components/Data-Table/columns/deleteAccountColumns";
import { useDeleteAccountRequests } from "@/hooks/supabase-calls/useDeleteAccountRequests";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function AllRequestsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "delete_req_page" });
  const { data, isLoading } = useDeleteAccountRequests({ page, pageSize });

  const requests = data?.requests || [];
  const totalItems = data?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => `${data.first_name} ${data.last_name}`,
      subtitle: (data) => data.email,
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          {data.status}
        </span>
      ),
    },
    fields: [
      { id: "reason", label: "Reason", render: (data) => data.reason || "No reason provided" },
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
          placeholder="🔍 Search requests..."
        />
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export List
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={deleteAccountColumns}
          data={requests}
          isLoading={isLoading}
          onRowClick={(row) => console.log('Row Click', row.id)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            totalItems: totalItems,
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
