"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { adminColumns } from "@/components/Data-Table/columns/adminColumns";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function AllAdminsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "admins_page" });
  const { data, isLoading } = useUsers({ admin: true, page, limit: pageSize });

  const admins = data?.users || [];
  const totalItems = data?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.name,
      subtitle: (data) => data.email,
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {data.status || 'active'}
        </span>
      ),
    },
    fields: [
      { id: "role", label: "Role", render: (data) => data.role },
      { id: "mfa", label: "MFA", render: (data) => (data.mfa_enabled ? '✅ ON' : '❌ OFF') },
    ],
    actions: [
      { label: "View Details", onClick: (data) => console.log('View', data.user_id) },
    ]
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search admins..."
        />
        <select className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option>All Roles</option>
        </select>
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={adminColumns}
          data={admins}
          isLoading={isLoading}
          onRowClick={(row) => console.log('Row Click', row.user_id)}
          onDeleteSelected={(rows) => console.log('Delete Rows', rows)}
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
