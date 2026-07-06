"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableState } from "@/hooks/use-table-state";
import { MobileCard } from "./mobile-card";
import { MobileCardConfig } from "./mobile-card-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  canNextPage: boolean;
  canPreviousPage: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<any, TValue>[];
  data: TData[];
  pagination?: PaginationProps | boolean;
  isLoading?: boolean;
  cardConfig?: MobileCardConfig<TData>;
  onRowClick?: (row: TData) => void;
  onDeleteSelected?: (selectedRows: TData[]) => void;
  deleteLabel?: string;
  selectable?: boolean;
  rowActions?: RowAction<TData>[];
  /** Enable URL persistence for pagination (uses "page" and "pageSize" params by default) */
  urlPersistence?: boolean | { pageKey?: string; pageSizeKey?: string };
  /** Total items count for URL persistence mode (required when urlPersistence is true and pagination is boolean) */
  totalItems?: number;
  /** Callback when page changes - useful for triggering data refetches */
  onPageChange?: (page: number) => void;
}

interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick?: (row: T) => void;
  danger?: boolean;
}

const DataTableComponent = <TData, TValue>({
  columns,
  data,
  pagination,
  isLoading = false,
  cardConfig,
  onRowClick,
  onDeleteSelected,
  deleteLabel = "Delete Selected",
  selectable = true,
  rowActions = [],
  urlPersistence = false,
  totalItems,
  onPageChange: onPageChangeProp,
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const isMobile = useIsMobile();
  const { scrollRef, showLeftShadow, showRightShadow } = useScrollShadow();

  // URL persistence for pagination
  const urlPaginationConfig = useMemo(() => {
    if (!urlPersistence) return null;
    if (typeof urlPersistence === "object") {
      return {
        pageKey: urlPersistence.pageKey || "page",
        pageSizeKey: urlPersistence.pageSizeKey || "pageSize",
      };
    }
    return { pageKey: "page", pageSizeKey: "pageSize" };
  }, [urlPersistence]);

  const tablePagination = useTableState(
    urlPaginationConfig || { defaultPage: 1, defaultPageSize: 10 },
  );

  // Determine if we're using URL-based pagination
  const useUrlPagination =
    urlPersistence && pagination === true && urlPaginationConfig;

  const finalColumns = useMemo(() => {
    if (selectable) {
      const selectColumn: ColumnDef<any> = {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      };
      return [selectColumn, ...columns];
    }
    return columns;
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true,
  });

  // Build pagination props for URL persistence mode
  const urlBasedPagination = useUrlPagination
    ? {
        currentPage: tablePagination.page,
        totalPages:
          Math.ceil((totalItems || data.length) / tablePagination.pageSize) ||
          1,
        totalItems: totalItems || data.length,
        pageSize: tablePagination.pageSize,
        onPageChange: tablePagination.setPage,
        onNextPage: () => tablePagination.setPage(tablePagination.page + 1),
        onPreviousPage: () =>
          tablePagination.setPage(Math.max(1, tablePagination.page - 1)),
        canNextPage:
          tablePagination.page <
          (Math.ceil((totalItems || data.length) / tablePagination.pageSize) ||
            1),
        canPreviousPage: tablePagination.page > 1,
      }
    : undefined;

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleRowClick = (row: TData) => {
    if (onRowClick) onRowClick(row);
  };

  const handleDelete = () => {
    if (onDeleteSelected) {
      onDeleteSelected(selectedRows.map((r) => r.original));
      setRowSelection({});
    }
  };

  const renderRowActions = (row: TData) => {
    if (!rowActions || rowActions.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-white z-[100]">
          {rowActions.map((action, i) => (
            <DropdownMenuItem
              key={i}
              onClick={() => action.onClick?.(row)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                action.danger
                  ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                  : "text-slate-700",
              )}
            >
              {action.icon && <span className="text-sm">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-4 relative">
      {/* Floating Bulk Actions Bar */}
      {hasSelection && onDeleteSelected && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate/50 text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-medium">
            {selectedRows.length} item{selectedRows.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="w-px h-4 bg-slate-700" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 hover:bg-white/10 h-8 font-bold uppercase tracking-widest text-[10px]"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteLabel}
          </Button>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-4">
          {isLoading && (
            <div className="flex w-full z-5 items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Updating...
            </div>
          )}
          <div className="space-y-3">
            {cardConfig ? (
              table
                .getRowModel()
                .rows.map((row) => (
                  <MobileCard
                    key={row.id}
                    data={row.original}
                    config={cardConfig}
                    onClick={() => handleRowClick(row.original)}
                  />
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No card configuration provided for mobile view
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll shadows */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/80 to-transparent pointer-events-none z-10 transition-opacity",
              showLeftShadow ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none z-10 transition-opacity",
              showRightShadow ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          )}

          <div
            ref={scrollRef}
            className="rounded-lg border border-slate-200 overflow-x-auto scroll-smooth shadow-sm"
          >
            <Table className="min-w-full">
              <TableHeader className="bg-slate-100">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                    {rowActions.length > 0 && (
                      <TableHead className="px-6 py-4 w-[50px]" />
                    )}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="bg-slate-100">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-slate-300",
                      )}
                      onClick={() => handleRowClick(row.original)}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-6 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                      {rowActions.length > 0 && (
                        <TableCell className="px-6 py-4">
                          {renderRowActions(row.original)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={finalColumns.length}
                      className="h-24 text-center text-slate-400"
                    >
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {(pagination || urlBasedPagination) && (
        <div className="flex items-center justify-between mt-4 px-2">
          {(() => {
            const pag =
              pagination && typeof pagination === "object"
                ? pagination
                : urlBasedPagination;
            if (!pag) return null;

            return (
              <>
                <div className="hidden sm:block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Showing {(pag.currentPage - 1) * pag.pageSize + 1} to{" "}
                  {Math.min(pag.currentPage * pag.pageSize, pag.totalItems)} of{" "}
                  {pag.totalItems} results
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pag.onPageChange(1)}
                    disabled={!pag.canPreviousPage || isLoading}
                    className="hidden sm:flex h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pag.onPreviousPage}
                    disabled={!pag.canPreviousPage || isLoading}
                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>

                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[11px] font-black text-slate-700">
                      {pag.currentPage}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      of
                    </span>
                    <span className="text-[11px] font-black text-slate-700">
                      {pag.totalPages}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pag.onNextPage}
                    disabled={!pag.canNextPage || isLoading}
                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pag.onPageChange(pag.totalPages)}
                    disabled={!pag.canNextPage || isLoading}
                    className="hidden sm:flex h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
