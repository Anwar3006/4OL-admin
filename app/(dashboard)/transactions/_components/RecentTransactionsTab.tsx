"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { transactionColumns } from "@/components/Data-Table/columns/transactionColumns";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";

const mockTransactions = [
  { id: "TXN-9021-X", date: "Today, 14:32", user: "Kofi Arhin", type: "Subscription", amount: "₵150.00", method: "MoMo", status: "Success" },
  { id: "TXN-8842-B", date: "Today, 12:10", user: "Ama Boateng", type: "IBP Fee", amount: "₵350.00", method: "Card", status: "Success" },
  { id: "TXN-7731-M", date: "Today, 10:45", user: "Yaw Mensah", type: "Subscription", amount: "₵150.00", method: "MoMo", status: "Failed" },
  { id: "TXN-6620-L", date: "Yesterday, 18:20", user: "Efua Mensah", type: "Subscription", amount: "₵150.00", method: "MoMo", status: "Success" },
  { id: "TXN-5519-K", date: "Yesterday, 16:15", user: "Kojo Antwi", type: "IBP Fee", amount: "₵350.00", method: "Card", status: "Success" },
];

export default function RecentTransactionsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "recent_tx_page" });

  const paginatedData = mockTransactions.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(mockTransactions.length / pageSize);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.user,
      subtitle: (data) => data.id,
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {data.status}
        </span>
      ),
    },
    fields: [
      { id: "amount", label: "Amount", render: (data) => data.amount },
      { id: "type", label: "Type", render: (data) => data.type },
    ],
    actions: [
      { label: "View Details", onClick: (data) => console.log('View', data.id) },
    ]
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search transactions..."
        />
        <button className="h-9 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
          📥 Export Data
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={transactionColumns}
          data={paginatedData}
          isLoading={false}
          onRowClick={(row) => console.log('Row Click', row.id)}
          cardConfig={cardConfig}
          pagination={{
            currentPage: page,
            totalPages: totalPages || 1,
            totalItems: mockTransactions.length,
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
