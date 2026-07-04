"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { deleteAccountColumns } from "@/components/Data-Table/columns/deleteAccountColumns";
import { useDeleteAccountRequests } from "@/hooks/supabase-calls/useDeleteAccountRequests";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function DeleteRequestsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "user_delete_req_page" });
  const { data, isLoading } = useDeleteAccountRequests({ page, limit: pageSize, status: 'pending' });

  const requests = data?.requests || [];
  const totalItems = data?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => `${data.first_name} ${data.last_name}`,
      subtitle: (data) => data.email,
      badge: (data) => (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-100">
          {data.status}
        </span>
      ),
    },
    fields: [
      { id: "reason", label: "Reason", render: (data) => data.reason || "Privacy Concerns" },
    ],
    actions: [
      { label: "View Details", onClick: (data) => console.log('View', data.id) },
    ]
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 text-xl">
          ⚠️
        </div>
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900 mb-1">Attention Required</h4>
          <p className="text-xs text-amber-700 leading-relaxed font-medium">
            <strong>{totalItems} pending deletion requests</strong> – must be processed within 30 days per Ghana Data Protection Act 2012 (Section 34).
          </p>
        </div>
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
