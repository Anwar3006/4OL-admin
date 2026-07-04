"use client";

import React, { memo, useMemo, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCard } from "./mobile-card";
import { MobileCardConfig } from "./mobile-card-types";

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
  pagination?: PaginationProps;
  isLoading?: boolean;
  cardConfig?: MobileCardConfig<TData>;
  onRowClick?: (row: TData) => void;
  onDeleteSelected?: (selectedRows: TData[]) => void;
  deleteLabel?: string;
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
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const isMobile = useIsMobile();
  const { scrollRef, showLeftShadow, showRightShadow } = useScrollShadow();

  const finalColumns = useMemo(() => {
    const selectColumn: ColumnDef<any> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
  }, [columns]);

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

  return (
    <div className="space-y-4 relative">
      {/* Floating Bulk Actions Bar */}
      {hasSelection && onDeleteSelected && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-medium">
            {selectedRows.length} item{selectedRows.length > 1 ? "s" : ""} selected
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
              table.getRowModel().rows.map((row) => (
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
              showLeftShadow ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none z-10 transition-opacity",
              showRightShadow ? "opacity-100" : "opacity-0"
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
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="bg-white dark:bg-slate-800">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                      onClick={() => handleRowClick(row.original)}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-6 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={finalColumns.length} className="h-24 text-center text-slate-400">
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
      {pagination && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="hidden sm:block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              pagination.totalItems
            )}{" "}
            of {pagination.totalItems} results
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={!pagination.canPreviousPage || isLoading}
              className="hidden sm:flex h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPreviousPage}
              disabled={!pagination.canPreviousPage || isLoading}
              className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="flex items-center gap-2 px-2">
              <span className="text-[11px] font-black text-slate-700">
                {pagination.currentPage}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                of
              </span>
              <span className="text-[11px] font-black text-slate-700">
                {pagination.totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNextPage}
              disabled={!pagination.canNextPage || isLoading}
              className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={!pagination.canNextPage || isLoading}
              className="hidden sm:flex h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
