"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Clock, Flag } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { useHasPermission } from "@/stores/permission-context";
import {
  IbpProduct,
  useBulkReviewProducts,
  useIbpOverview,
  useIbpProducts,
  useReviewProduct,
} from "@/features/ibp/data/useIBP";
import { formatDate } from "./ibp-shared";

const STATUS_FILTERS = [
  { value: "", label: "All Products" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
];

const PRODUCT_BADGES: Record<string, string> = {
  pending: "badge badge-amber",
  published: "badge badge-green",
  rejected: "badge badge-red",
  flagged: "badge badge-purple",
};

export default function IbpProductsTab() {
  const canEdit = useHasPermission("ibp.edit");
  const overview = useIbpOverview();
  const [statusFilter, setStatusFilter] = useState("");
  const review = useReviewProduct();
  const bulkReview = useBulkReviewProducts();
  const { data, isLoading, isError, error } = useIbpProducts(statusFilter || undefined);

  const products = data?.products ?? [];
  const stats = overview.data?.stats;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "product",
        header: "Product",
        cell: ({ row }: { row: { original: IbpProduct } }) => (
          <div className="flex items-center gap-2">
            {row.original.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.image_url}
                alt=""
                className="h-9 w-9 rounded-lg object-cover border border-slate-100"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                📦
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">{row.original.name}</span>
              <span className="text-xs text-slate-400">{row.original.category ?? "Uncategorised"}</span>
            </div>
          </div>
        ),
      },
      {
        id: "business",
        header: "Business",
        cell: ({ row }: { row: { original: IbpProduct } }) => (
          <span className="text-xs text-slate-600">{row.original.business_name ?? "—"}</span>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cell: ({ row }: { row: { original: IbpProduct } }) => (
          <span className="text-xs text-slate-500">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: IbpProduct } }) => (
          <span className={PRODUCT_BADGES[row.original.status] ?? "badge badge-slate"}>
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo(() => {
    if (!canEdit) return [];
    return [
      {
        label: "Approve & Publish",
        onClick: (row: IbpProduct) => review.mutate({ id: row.id, action: "approve" }),
      },
      {
        label: "Reject",
        danger: true,
        onClick: (row: IbpProduct) => {
          const reason = window.prompt("Reason for rejection:");
          if (reason?.trim()) review.mutate({ id: row.id, action: "reject", reason: reason.trim() });
        },
      },
    ];
  }, [canEdit, review]);

  const pendingSelection = (rows: IbpProduct[]) => {
    bulkReview.mutate({
      ids: rows.map((r) => r.id),
      action: "approve",
    });
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Products Published"
          value={stats?.products_published ?? "..."}
          variant="green"
          delta="Live in mobile app"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Awaiting Review"
          value={stats?.products_pending ?? "..."}
          variant="amber"
          delta="Pending moderation"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Flag className="h-5 w-5" />}
          label="Total Products"
          value={data?.total ?? "..."}
          variant="blue"
          delta="All statuses"
          deltaType="neutral"
          isLoading={isLoading}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            className={`btn btn-sm ${statusFilter === filter.value ? "btn-primary text-white" : "btn-secondary"}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={products}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={canEdit}
          onDeleteSelected={canEdit ? pendingSelection : undefined}
          deleteLabel="Approve Selected"
          rowActions={rowActions}
        />
        {!isLoading && products.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">
            No products {statusFilter ? `with status "${statusFilter}"` : "yet"} — products
            appear here when IBPs add them in the business app.
          </div>
        )}
      </div>
    </div>
  );
}
