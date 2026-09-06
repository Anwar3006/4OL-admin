"use client";

import React, { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  DeleteAccountRequest,
  useDeleteAccountRequests,
  useUpdateDeleteRequestStatus,
} from "@/features/delete-account-requests/data/useDeleteAccountRequests";
import { usePagination } from "@/hooks/use-pagination";
import { useHasPermission } from "@/stores/permission-context";

const STATUS_BADGES: Record<string, string> = {
  pending_review: "badge badge-amber",
  in_verification: "badge badge-blue",
  grace_period: "badge badge-purple",
  completed: "badge badge-green",
  cancelled: "badge badge-slate",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  in_verification: "In Verification",
  grace_period: "Grace Period",
  completed: "Completed",
  cancelled: "Cancelled",
};

// GH-DPA 2012 §34: erasure requests must be actioned within 30 days.
const daysRemaining = (createdAt: string): number =>
  30 - Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);

export default function DeleteRequestsTab() {
  const canApprove = useHasPermission("deleteaccount.approve");
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "user_delete_req_page" });
  // No status filter — the old 'pending' value no longer exists (Epic 21
  // vocabulary). Show the full lifecycle, pending first per the hook order.
  const { data, isLoading, isError, error } = useDeleteAccountRequests({
    page,
    limit: pageSize,
  });
  const updateStatus = useUpdateDeleteRequestStatus();

  const requests = data?.requests ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const urgentCount = requests.filter(
    (r) => r.status === "pending_review" && daysRemaining(r.created_at) <= 7,
  ).length;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }: { row: { original: DeleteAccountRequest } }) => (
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-slate-800">
              {row.original.first_name} {row.original.last_name}
            </span>
            <span className="text-[11px] text-slate-400">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }: { row: { original: DeleteAccountRequest } }) => (
          <span className="text-[11px] text-slate-600">
            {row.original.reason || "Privacy concerns"}
          </span>
        ),
      },
      {
        id: "requested",
        header: "Requested",
        cell: ({ row }: { row: { original: DeleteAccountRequest } }) => (
          <span className="text-[11px] text-slate-500">
            {new Date(row.original.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "days_remaining",
        header: "Days Remaining",
        cell: ({ row }: { row: { original: DeleteAccountRequest } }) => {
          const days = daysRemaining(row.original.created_at);
          if (row.original.status === "completed" || row.original.status === "cancelled") {
            return <span className="text-[11px] text-slate-400">—</span>;
          }
          const cls =
            days <= 0
              ? "badge badge-red"
              : days <= 7
                ? "badge badge-amber"
                : "badge badge-green";
          return <span className={cls}>{days <= 0 ? "Overdue" : `${days}d`}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: DeleteAccountRequest } }) => (
          <span className={STATUS_BADGES[row.original.status] ?? "badge badge-slate"}>
            {STATUS_LABELS[row.original.status] ?? row.original.status}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo(() => {
    if (!canApprove) return [];
    return [
      {
        label: "Start Verification",
        onClick: (row: DeleteAccountRequest) =>
          updateStatus.mutate({
            requestId: row.id,
            userId: row.user_id,
            newStatus: "in_verification",
          }),
      },
      {
        label: "Approve → Grace Period",
        danger: true,
        onClick: (row: DeleteAccountRequest) =>
          updateStatus.mutate({
            requestId: row.id,
            userId: row.user_id,
            newStatus: "grace_period",
          }),
      },
      {
        label: "Mark Completed",
        onClick: (row: DeleteAccountRequest) =>
          updateStatus.mutate({
            requestId: row.id,
            userId: row.user_id,
            newStatus: "completed",
          }),
      },
      {
        label: "Cancel Request",
        onClick: (row: DeleteAccountRequest) =>
          updateStatus.mutate({
            requestId: row.id,
            userId: row.user_id,
            newStatus: "cancelled",
          }),
      },
    ];
  }, [canApprove, updateStatus]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 text-xl">
          ⚠️
        </div>
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900 mb-1">
            Attention Required
          </h4>
          <p className="text-xs text-amber-700 leading-relaxed font-medium">
            <strong>{totalItems} deletion request{totalItems === 1 ? "" : "s"}</strong> –
            must be processed within 30 days per Ghana Data Protection Act 2012
            (Section 34).
            {urgentCount > 0 && (
              <strong className="text-red-600"> {urgentCount} due within 7 days.</strong>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={requests}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={false}
          rowActions={rowActions}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
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
