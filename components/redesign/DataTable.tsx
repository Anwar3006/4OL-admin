"use client";

import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Column<T> = {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
};

export type RowAction<T> = {
  label: string;
  danger?: boolean;
  onClick: (row: T) => void;
};

type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  data: T[];
  pagination?: boolean;
  externalPage?: number;
  externalTotalPages?: number;
  onPageChange?: (page: number) => void;
  getRowId: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  isLoading?: boolean;
};

export default function DataTable<T extends Record<string, any>>({
  caption,
  columns,
  data,
  pagination = true,
  externalPage,
  externalTotalPages,
  onPageChange,
  getRowId,
  onRowClick,
  rowActions = [],
  isLoading = false,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const page = externalPage ?? internalPage;
  const totalPages = externalTotalPages ?? 1;

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (onPageChange) onPageChange(clamped);
    else setInternalPage(clamped);
  };

  return (
    <div className={cn("overflow-x-auto", isLoading && "opacity-60")}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.key}
                // Matches components/Data-Table/data-table.tsx, which the other
                // 17 features use. This component's only consumer is Period,
                // and plain sentence-case headers here were the whole reason
                // that page read as a different typeface to the rest.
                className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
              >
                {column.label}
              </th>
            ))}
            {rowActions.length > 0 && (
              <th className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const isClickable = !!onRowClick;
            return (
              <tr
                key={getRowId(row, index)}
                className={cn(
                  "border-b last:border-0",
                  isClickable && "cursor-pointer hover:bg-slate-50",
                )}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (!isClickable) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick?.(row);
                  }
                }}
              >
                {columns.map((column) => (
                  <td key={column.key} className="p-3 align-top">
                    {column.render
                      ? column.render(row[column.key], row)
                      : (row[column.key] ?? "—")}
                  </td>
                ))}
                {rowActions.length > 0 && (
                  <td
                    className="p-3 text-right align-top"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            className={cn(
                              action.danger &&
                                "text-red-600 focus:text-red-600",
                            )}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            );
          })}
          {!data.length && (
            <tr>
              <td colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)} className="p-6 text-center text-slate-500">
                No records to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
