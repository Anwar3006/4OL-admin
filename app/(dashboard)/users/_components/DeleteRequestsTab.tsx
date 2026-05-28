import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Trash2, XCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeleteRequestRow {
  id: string;
  email: string;
  requestDate: string;
  reason: string;
  daysRemaining: number;
  status: string;
  statusVariant: string;
}

const deleteRequests: DeleteRequestRow[] = [
  {
    id: "4OL-008821", email: "kofi.owner@gmail.com", requestDate: "May 1, 2026",
    reason: "Personal reasons", daysRemaining: 23, status: "Pending", statusVariant: "gold"
  },
];

export default function DeleteRequestsTab() {
  const columns: Column<DeleteRequestRow>[] = [
    {
      key: "user",
      label: "User",
      render: (_, row) => (
        <div>
          <div className="font-bold text-slate-800">{row.id}</div>
          <div className="text-[10px] text-slate-400">{row.email}</div>
        </div>
      )
    },
    { key: "requestDate", label: "Request Date" },
    { key: "reason", label: "Reason" },
    {
      key: "daysRemaining",
      label: "Days Remaining",
      render: (val) => <b className="text-ek-gold">{val} days left</b>
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => <span className={cn("badge", `badge-${row.statusVariant}`)}>{val}</span>
    },
  ];

  const rowActions: RowAction<DeleteRequestRow>[] = [
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: (row) => console.log('Delete', row.id), danger: true },
    { label: "Reject", icon: <XCircle className="w-4 h-4" />, onClick: (row) => console.log('Reject', row.id) },
  ];

  return (
    <div className="space-y-4">
      <div className="alert bg-amber-50 border border-amber-200 text-xs p-3 rounded-lg flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <strong className="text-amber-700">1 pending deletion request</strong> – must be processed within 30 days per Ghana Data Protection Act 2012 (Section 34).
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={deleteRequests} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
