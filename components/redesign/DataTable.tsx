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
import "@/components/mockup-theme/mockup-theme.css";

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
  /** Extra class for a specific row's <tr> -- e.g. the mockup's flagged-row
   * amber highlight (admin-panel.html:6143, `style="background:#FFFBEB"`). */
  getRowClassName?: (row: T) => string | undefined;
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
  getRowClassName,
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
    <div className={cn("mockup-theme overflow-x-auto", isLoading && "opacity-60")}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {rowActions.length > 0 && (
              <th>
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
                className={cn(isClickable && "cursor-pointer", getRowClassName?.(row))}
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
                  <td key={column.key}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : (row[column.key] ?? "—")}
                  </td>
                ))}
                {rowActions.length > 0 && (
                  <td
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
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
                                "text-red-600 dark:text-red-400 focus:text-red-600",
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
              <td colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)} className="td-s text-center">
                No records to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && totalPages > 1 && (
        <div className="pag">
          <span>Page {page} of {totalPages}</span>
          <div className="pag-b">
            <button
              type="button"
              className="pb"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="pb"
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
