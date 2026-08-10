"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { userColumns } from "@/components/Data-Table/columns/userColumns";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { User, Mail, Phone } from "lucide-react";
import { useViewUserDialog } from "@/stores/dialog-store";

export default function AllUsersTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "users_page" });
  const { data, isLoading } = useUsers({ admin: false, page, limit: pageSize });
  const viewDialog = useViewUserDialog();

  const users = data?.users || [];
  const totalItems = data?.meta?.total ?? 0;
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
      {
        id: "phone",
        label: "Phone",
        icon: <Phone className="w-3 h-3" />,
        render: (data) => data.phone_number || 'N/A',
      },
      {
        id: "type",
        label: "Type",
        render: (data) => data.user_type,
      }
    ],
    actions: [
      { label: "View User", onClick: (data) => viewDialog.open(data.user_id) },
      { label: "Edit User", onClick: (data) => console.log('Edit', data.user_id) },
    ]
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search users..."
        />
        <select className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option>All Plans</option>
        </select>
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={userColumns}
          data={users}
          isLoading={isLoading}
          onRowClick={(row) => viewDialog.open(row.user_id)}
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
