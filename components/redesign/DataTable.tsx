"use client";

import React, { useState } from "react";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  width?: string | number;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick?: (row: T) => void;
  danger?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  dark?: boolean;
  rowActions?: RowAction<T>[];
  selectable?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
  externalTotalPages?: number;
  externalPage?: number;
  onPageChange?: (page: number) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  dark = false,
  rowActions = [],
  selectable = false,
  pagination = true,
  itemsPerPage = 10,
  externalTotalPages,
  externalPage,
  onPageChange,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [internalPage, setInternalPage] = useState(1);
  const [openMenuRow, setOpenMenuRow] = useState<number | null>(null);

  const isExternal = externalTotalPages !== undefined && externalPage !== undefined;
  const currentPage = isExternal ? externalPage! : internalPage;
  const totalPages = isExternal
    ? externalTotalPages!
    : Math.ceil(data.length / itemsPerPage);
  const paginatedData = isExternal
    ? data
    : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (isExternal) onPageChange?.(page);
    else setInternalPage(page);
  };

  const toggleAll = () =>
    setSelectedRows(
      selectedRows.size === paginatedData.length
        ? new Set()
        : new Set(paginatedData.map((_, i) => i)),
    );

  const toggleRow = (idx: number) => {
    const next = new Set(selectedRows);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedRows(next);
  };

  const tableClass = dark ? "data-table-dark" : "data-table";

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 2,
  );

  return (
    <div>
      {/* Horizontal scroll container */}
      <div className="overflow-x-auto w-full">
        <table className={tableClass} style={{ minWidth: "540px" }}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              {rowActions.length > 0 && <th style={{ width: 36 }} />}
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx}>
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => toggleRow(idx)}
                      className="cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {rowActions.length > 0 && (
                  <td>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuRow(openMenuRow === idx ? null : idx)}
                        className="w-7 h-7 rounded-md flex items-center justify-center
                                   text-slate-400 hover:bg-slate-100 hover:text-slate-600
                                   transition-colors cursor-pointer bg-transparent border-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openMenuRow === idx && (
                        <>
                          {/* Invisible backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuRow(null)}
                          />
                          <div
                            className="absolute top-full right-0 mt-1 bg-white
                                        border border-slate-200 rounded-lg z-20 py-1 overflow-hidden"
                            style={{ minWidth: 160, boxShadow: "var(--shadow-dropdown)" }}
                          >
                            {rowActions.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  action.onClick?.(row);
                                  setOpenMenuRow(null);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs cursor-pointer bg-transparent border-0",
                                  "flex items-center gap-2 transition-colors hover:bg-slate-50",
                                  action.danger ? "text-red-600" : "text-slate-700",
                                )}
                              >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="pag">
          <span>
            {isExternal
              ? `Page ${currentPage} of ${totalPages}`
              : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                  currentPage * itemsPerPage,
                  data.length,
                )} of ${data.length}`}
          </span>

          <div className="pag-b">
            <button
              className="pb"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {pageNums.map((n, i) => {
              const prev = pageNums[i - 1];
              return (
                <React.Fragment key={n}>
                  {prev !== undefined && n - prev > 1 && (
                    <span className="text-slate-300 text-xs px-1">…</span>
                  )}
                  <button
                    className={cn("pb", n === currentPage && "active")}
                    onClick={() => handlePageChange(n)}
                  >
                    {n}
                  </button>
                </React.Fragment>
              );
            })}

            <button
              className="pb"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
