"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/Data-Table/data-table";
import { usePagination } from "@/hooks/use-pagination";
import { useHasPermission } from "@/stores/permission-context";
import { IbpRow, useIbpAction, useIbps } from "@/features/ibp/data/useIBP";
import { formatDate, formatMoney, IbpViewDialog, STATUS_BADGES } from "./ibp-shared";

interface IbpListTabProps {
  /** Comma-separated status filter (e.g. "active,approved"). Omit for all. */
  status?: string;
  paginationKey: string;
  emptyLabel: string;
  /** Show the registration-docs column (Pending tab). */
  showDocs?: boolean;
  /** Show the suspension-reason column (Suspended tab). */
  showSuspension?: boolean;
  /** Inline Verify/Reject quick actions (Pending tab). */
  quickVerify?: boolean;
  banner?: React.ReactNode;
}

export default function IbpListTab({
  status,
  paginationKey,
  emptyLabel,
  showDocs = false,
  showSuspension = false,
  quickVerify = false,
  banner,
}: IbpListTabProps) {
  const canEdit = useHasPermission("ibp.edit");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<IbpRow | null>(null);
  const { page, pageSize, onPageChange, onNextPage, onPreviousPage } =
    usePagination({ key: paginationKey });
  const action = useIbpAction();

  const { data, isLoading, isError, error } = useIbps({
    status,
    search: search || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const businesses = data?.businesses ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: "business",
        header: "Business",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">
              {row.original.business_name}
              {row.original.is_featured && <span className="ml-1">⭐</span>}
            </span>
            <span className="text-xs text-slate-400">
              {row.original.business_category ?? "—"}
              {row.original.specific_category ? ` · ${row.original.specific_category}` : ""}
            </span>
          </div>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-xs text-slate-600">
            {[row.original.city, row.original.region].filter(Boolean).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-xs text-slate-600">{row.original.phone_number ?? "—"}</span>
        ),
      },
      {
        id: "branches",
        header: "Branches",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-xs font-semibold text-slate-600">{row.original.branches ?? 1}</span>
        ),
      },
      {
        id: "spend",
        header: "Spend",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-xs text-slate-600">{formatMoney(row.original.total_spend)}</span>
        ),
      },
      {
        id: "registered",
        header: "Registered",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className="text-xs text-slate-500">{formatDate(row.original.created_at)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <span className={STATUS_BADGES[row.original.status ?? ""] ?? "badge badge-slate"}>
            {row.original.status ?? "unknown"}
          </span>
        ),
      },
    ];

    if (showDocs) {
      cols.splice(4, 0, {
        id: "docs",
        header: "Documents",
        cell: ({ row }: { row: { original: IbpRow } }) => {
          const docs = row.original.registration_docs ?? [];
          return docs.length > 0 ? (
            <span className="badge badge-blue">📄 {docs.length} doc{docs.length > 1 ? "s" : ""}</span>
          ) : (
            <span className="text-2xs font-semibold uppercase tracking-wider text-red-400">
              None submitted
            </span>
          );
        },
      });
    }

    if (showSuspension) {
      cols.splice(6, 0, {
        id: "suspension",
        header: "Suspended",
        cell: ({ row }: { row: { original: IbpRow } }) => (
          <div className="flex flex-col max-w-[220px]">
            <span className="text-xs text-slate-600 truncate">
              {row.original.suspended_reason ?? "—"}
            </span>
            <span className="text-2xs text-slate-400">{formatDate(row.original.suspended_at)}</span>
          </div>
        ),
      });
    }

    return cols;
  }, [showDocs, showSuspension]);

  const rowActions = useMemo(() => {
    const base: { label: string; onClick: (row: IbpRow) => void; danger?: boolean }[] = [
      { label: "View Details", onClick: (row) => setViewing(row) },
    ];
    if (canEdit && quickVerify) {
      base.push(
        {
          label: "Verify & Publish",
          onClick: (row) => action.mutate({ id: row.id, action: "verify" }),
        },
        {
          label: "Reject",
          danger: true,
          onClick: (row) => {
            const reason = window.prompt("Reason for rejection:");
            if (reason?.trim()) action.mutate({ id: row.id, action: "reject", reason: reason.trim() });
          },
        },
      );
    }
    return base;
  }, [canEdit, quickVerify, action]);

  return (
    <div className="w-full min-w-0 space-y-4">
      {banner}
      <input
        className="w-full sm:max-w-sm h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        placeholder="🔍 Search businesses…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={businesses}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable={false}
          onRowClick={(row) => setViewing(row)}
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
        {!isLoading && businesses.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">{emptyLabel}</div>
        )}
      </div>
      <IbpViewDialog ibp={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
