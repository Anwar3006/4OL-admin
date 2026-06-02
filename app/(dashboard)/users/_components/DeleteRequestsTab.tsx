import React, { useState } from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Trash2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeleteAccountRequests, useUpdateDeleteRequestStatus, DeleteAccountRequest } from "@/hooks/supabase-calls/useDeleteAccountRequests";
import { format } from "date-fns";

export default function DeleteRequestsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDeleteAccountRequests({ page, limit: 10, status: 'pending' });
  const updateStatus = useUpdateDeleteRequestStatus();

  const requests = data?.requests || [];

  const columns: Column<DeleteAccountRequest>[] = [
    {
      key: "user",
      label: "User",
      render: (_, row) => (
        <div>
          <div className="font-bold text-slate-800">{row.first_name} {row.last_name}</div>
          <div className="text-[10px] text-slate-400">{row.email}</div>
        </div>
      )
    },
    { key: "created_at", label: "Request Date", render: (val) => format(new Date(val), "MMM dd, yyyy") },
    { key: "reason", label: "Reason" },
    {
      key: "status",
      label: "Status",
      render: (val, row) => <span className={cn("badge", row.status === 'pending' ? 'badge-gold' : 'badge-secondary')}>{val}</span>
    },
  ];

  const rowActions: RowAction<DeleteAccountRequest>[] = [
    { label: "Approve", icon: <Trash2 className="w-4 h-4" />, onClick: (row) => updateStatus.mutate({ requestId: row.id, userId: row.user_id, newStatus: 'approved' }), danger: true },
    { label: "Reject", icon: <XCircle className="w-4 h-4" />, onClick: (row) => updateStatus.mutate({ requestId: row.id, userId: row.user_id, newStatus: 'rejected' }) },
  ];

  return (
    <div className="space-y-4">
      <div className="alert bg-amber-50 border border-amber-200 text-xs p-3 rounded-lg flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <strong className="text-amber-700">{data?.meta.total || 0} pending deletion request{data?.meta.total !== 1 ? 's' : ''}</strong> – must be processed within 30 days per Ghana Data Protection Act 2012 (Section 34).
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={requests} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
