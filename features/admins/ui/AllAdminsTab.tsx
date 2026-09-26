"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { adminColumns } from "@/components/Data-Table/columns/adminColumns";
import { useUsers } from "@/features/users/data/useUser";
import { useViewAdminDialog } from "@/features/admins/data/dialog-hooks";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

export default function AllAdminsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "admins_page" });
  const { data, isLoading, isError, error } = useUsers({ admin: true, page, limit: pageSize });
  const { open: openViewAdmin } = useViewAdminDialog();

  const admins = data?.users || [];
  const totalItems = data?.meta.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.name,
      subtitle: (data) => data.email,
      badge: (data) => (
        <span
          className={`text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            data.status === "active"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
              : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30"
          }`}
        >
          {data.status || "active"}
        </span>
      ),
    },
    fields: [
      { id: "role", label: "Role", render: (data) => data.role },
      {
        id: "mfa",
        label: "MFA",
        render: (data) => (data.mfa_enabled ? "✅ ON" : "❌ OFF"),
      },
    ],
    actions: [
      {
        label: "View Details",
        onClick: (data) => openViewAdmin(data.user_id),
      },
    ],
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search admins..."
        />
        <select className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option>All Roles</option>
        </select>
        <button className="h-9 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          📥 Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable
          columns={adminColumns}
          data={admins}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRowClick={(row) => openViewAdmin(row.user_id)}
          onDeleteSelected={(rows) => console.log("Delete Rows", rows)}
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
