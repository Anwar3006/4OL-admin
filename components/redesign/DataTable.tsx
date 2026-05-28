"use client"

import React, { useState } from 'react'
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  width?: string | number
  render?: (value: any, row: T) => React.ReactNode
}

export interface RowAction<T> {
  label: string
  icon?: React.ReactNode
  onClick?: (row: T) => void
  danger?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  dark?: boolean
  rowActions?: RowAction<T>[]
  selectable?: boolean
  pagination?: boolean
  itemsPerPage?: number
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  dark = false,
  rowActions = [],
  selectable = false,
  pagination = true,
  itemsPerPage = 10,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuRow, setOpenMenuRow] = useState<number | null>(null)

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(start, start + itemsPerPage)

  const toggleAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => i)))
    }
  }

  const toggleRow = (idx: number) => {
    const next = new Set(selectedRows)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedRows(next)
  }

  const tableClass = dark ? 'data-table-dark' : 'data-table'

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              {selectable && (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
              ))}
              {rowActions.length > 0 && <th className="w-10" />}
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
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenuRow === idx && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuRow(null)}></div>
                          <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-dropdown min-w-[160px] z-20 py-1 overflow-hidden">
                            {rowActions.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => { action.onClick?.(row); setOpenMenuRow(null) }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 flex items-center gap-2 transition-colors",
                                  action.danger ? 'text-ek-red hover:bg-ek-red-light' : 'text-slate-700'
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

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-slate-500">
            Showing {start + 1}-{Math.min(start + itemsPerPage, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Simple pagination: show all pages if few, or a subset if many. For now, show all like target. */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                  page === currentPage
                    ? 'bg-ek-green text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
