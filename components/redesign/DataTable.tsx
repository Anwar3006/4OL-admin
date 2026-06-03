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
  isLoading?: boolean;
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
  isLoading = false,
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
              {rowActions.length > 0 && <th style={{ width: 36, overflow: 'visible' }} />}
            </tr>
          </thead>

          <tbody style={{ overflow: 'visible' }}>
            {isLoading ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} 
                  className="py-24 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-[3px] border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} 
                  className="py-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl opacity-50">📂</span>
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">No records found</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} style={{ overflow: 'visible' }}>
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
                    <td style={{ overflow: 'visible' }}>
                      <div className="relative">
                        <button
                          id={`menu-btn-${idx}`}
                          onClick={() => setOpenMenuRow(openMenuRow === idx ? null : idx)}
                          className="w-7 h-7 rounded-md flex items-center justify-center
                                     text-slate-400 hover:bg-slate-100 hover:text-slate-600
                                     transition-colors cursor-pointer bg-transparent border-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenuRow === idx && (
                          <div className="fixed inset-0 z-50">
                            {/* Invisible backdrop to close menu */}
                            <div
                              className="fixed inset-0 z-50"
                              onClick={() => setOpenMenuRow(null)}
                            />
                            <div
                              className="absolute bg-white border border-slate-200 rounded-lg z-[60] py-1 overflow-hidden"
                              style={{ 
                                minWidth: 160, 
                                boxShadow: "var(--shadow-dropdown)",
                                top: (document.getElementById(`menu-btn-${idx}`)?.getBoundingClientRect().bottom || 0) + 5,
                                left: (document.getElementById(`menu-btn-${idx}`)?.getBoundingClientRect().left || 0) - 120
                              }}
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
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
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
