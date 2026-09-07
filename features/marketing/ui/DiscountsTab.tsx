"use client";

/**
 * Marketing → Discounts tab — mockup parity build (KPI row, search + type +
 * status filters, Export, Create Code, pause/clone/copy/delete row actions,
 * bulk pause/delete). Marketing unification build: rows come from
 * /api/marketing/discounts (marketing_discounts + campaign name merge).
 */

import React, { useMemo, useState } from "react";
import { Tag, BarChart3, Percent } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { createDiscountColumns } from "./discountColumns";
import { Button } from "@/components/ui/button";
import DiscountDialog from "./discount-dialog";
import { downloadCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner";
import {
  useMarketingDiscounts,
  useUpdateMarketingDiscount,
  useDeleteMarketingDiscount,
} from "@/features/marketing/data/useDiscounts";
import { TDiscountRow } from "@/features/marketing/schema/discount";

const FILTER_SELECT_CLASS =
  "h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  { value: "percentage", label: "% Off" },
  { value: "fixed", label: "Fixed" },
  { value: "free_trial", label: "Free Trial" },
  { value: "partner", label: "Partner" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
];

export default function DiscountsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({ key: "discounts_page" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; discount: TDiscountRow | null }>({
    open: false,
    discount: null,
  });

  const updateMutation = useUpdateMarketingDiscount();
  const deleteMutation = useDeleteMarketingDiscount();

  const { data, isLoading, isError, error } = useMarketingDiscounts({
    page,
    limit: pageSize,
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const discounts = data?.data ?? [];
  const analytics = data?.analytics;
  const totalPages = data?.meta?.totalPages || 1;

  const columns = useMemo(
    () =>
      createDiscountColumns({
        onEdit: (discount) => setDialog({ open: true, discount }),
      }),
    [],
  );

  const handleExport = () => {
    downloadCsv(
      discounts.map((row) => ({
        Code: row.code,
        Name: row.name,
        Type: row.discount_type,
        Value: row.discount_value,
        "Eligible Users": row.eligible_users ?? "all",
        Uses: row.current_uses ?? 0,
        Limit: row.max_uses ?? "",
        Starts: row.valid_from,
        Expires: row.valid_until ?? "",
        Campaign: row.campaign_name ?? "",
        Status: row.status ?? "active",
      })),
      "discounts",
    );
  };

  const handleBulkPause = async (rows: TDiscountRow[]) => {
    for (const row of rows) {
      await updateMutation.mutateAsync({ id: row.id, data: { status: "paused" } });
    }
    toast.success(`${rows.length} code(s) paused`);
  };

  const handleBulkDelete = async (rows: TDiscountRow[]) => {
    if (!window.confirm(`Delete ${rows.length} discount code(s)? This cannot be undone.`)) {
      return;
    }
    for (const row of rows) {
      await deleteMutation.mutateAsync(row.id);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<Tag className="size-4" />}
          label="Active Codes"
          value={analytics?.active_codes ?? 0}
          variant="green"
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon={<BarChart3 className="size-4" />}
          label="Total Uses"
          value={analytics?.total_uses ?? 0}
          variant="blue"
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon={<Percent className="size-4" />}
          label="Avg Discount"
          value={`${analytics?.avg_discount_pct ?? 0}%`}
          variant="amber"
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          placeholder="🔍 Search promo codes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onPageChange(1);
          }}
        />
        <select
          className={FILTER_SELECT_CLASS}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            onPageChange(1);
          }}
        >
          {TYPE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className={FILTER_SELECT_CLASS}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            onPageChange(1);
          }}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest"
        >
          📥 Export
        </Button>
        <Button
          size="sm"
          onClick={() => setDialog({ open: true, discount: null })}
          className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          + Create Code
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={discounts}
          isLoading={isLoading}
          isError={isError}
          error={error}
          bulkActions={[
            { label: "⏸️ Pause Selected", onClick: (rows) => void handleBulkPause(rows) },
          ]}
          onDeleteSelected={(rows) => void handleBulkDelete(rows)}
          deleteLabel="🗑️ Delete Selected"
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: data?.meta?.total || 0,
            pageSize: pageSize,
            onPageChange,
            onNextPage,
            onPreviousPage,
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
      </div>

      <DiscountDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        discount={dialog.discount}
      />
    </div>
  );
}
