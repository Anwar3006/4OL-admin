"use client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useState, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { useScrollShadow } from "@/hooks/use-scroll-shadow";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  cardConfig?: MobileCardConfig<TData>; // Optional card configuration for mobile view
  onRowClick: (row: TData) => void;
  route?: string;
}

const DataTableComponent = <TData, TValue>({
  columns,
  data,
  pagination,
  isLoading = false,
  cardConfig,
  onRowClick,
  route,
}: DataTableProps<TData, TValue>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const isMobile = useIsMobile();
  const { scrollRef, showLeftShadow, showRightShadow } = useScrollShadow();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true, // ✅ Important: Tell table we handle pagination
    state: {
      sorting,
    },
  });

  const handleRowClick = (row: TData) => {
    onRowClick(row);
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Loading overlay for refetch */}
        {isLoading && (
          <div className="flex w-full z-5 items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Updating...
          </div>
        )}

        <div className="space-y-3">
          {cardConfig ? (
            // Render with custom card config
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
            // Fallback if no card config provided
            <div className="text-center py-8 text-muted-foreground">
              No card configuration provided for mobile view
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        {pagination && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.onPreviousPage}
                disabled={!pagination.canPreviousPage || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.onNextPage}
                disabled={!pagination.canNextPage || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Scroll shadows */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-white to-transparent pointer-events-none z-10 transition-opacity",
            showLeftShadow ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-white to-transparent pointer-events-none z-10 transition-opacity",
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
          className="rounded-md border overflow-x-auto scroll-smooth"
        >
          <Table>
            <TableHeader className="bg-gray-50/50 sticky top-0 z-2 xl:text-xl">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Desktop Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              pagination.totalItems
            )}{" "}
            of {pagination.totalItems} results
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={!pagination.canPreviousPage || isLoading}
              className="hidden sm:flex"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPreviousPage}
              disabled={!pagination.canPreviousPage || isLoading}
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">
                {pagination.currentPage}
              </span>
              <span className="text-sm text-muted-foreground">of</span>
              <span className="text-sm font-medium">
                {pagination.totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNextPage}
              disabled={!pagination.canNextPage || isLoading}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={!pagination.canNextPage || isLoading}
              className="hidden sm:flex"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ⚡ Bolt Optimization: Wrapped DataTable with React.memo to prevent unnecessary re-renders.
// For this to be effective, props passed from parent components (like `onRowClick` and `pagination`)
// must be memoized using `useCallback` and `useMemo` respectively.
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
