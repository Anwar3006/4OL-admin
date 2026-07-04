"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface UseTableStateOptions {
  /** URL search param key for page number (default: "page") */
  pageKey?: string;
  /** URL search param key for page size (default: "pageSize") */
  pageSizeKey?: string;
  /** Default page number */
  defaultPage?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Additional filter keys to persist in URL */
  filterKeys?: string[];
}

export function useTableState(options: UseTableStateOptions = {}) {
  const {
    pageKey = "page",
    pageSizeKey = "pageSize",
    defaultPage = 1,
    defaultPageSize = 10,
    filterKeys = [],
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current state from URL
  const page = useMemo(() => {
    const p = searchParams.get(pageKey);
    return p ? Math.max(1, parseInt(p, 10)) : defaultPage;
  }, [searchParams, pageKey, defaultPage]);

  const pageSize = useMemo(() => {
    const ps = searchParams.get(pageSizeKey);
    return ps ? Math.max(1, parseInt(ps, 10)) : defaultPageSize;
  }, [searchParams, pageSizeKey, defaultPageSize]);

  // Read filter values from URL
  const filters = useMemo(() => {
    const result: Record<string, string> = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) result[key] = value;
    });
    return result;
  }, [searchParams, filterKeys]);

  // Update URL with new state
  const updateUrl = useCallback(
    (updates: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, string | undefined>;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update page
      if (updates.page !== undefined) {
        if (updates.page <= 1) {
          params.delete(pageKey);
        } else {
          params.set(pageKey, updates.page.toString());
        }
      }

      // Update page size
      if (updates.pageSize !== undefined) {
        if (updates.pageSize === defaultPageSize) {
          params.delete(pageSizeKey);
        } else {
          params.set(pageSizeKey, updates.pageSize.toString());
        }
      }

      // Update filters
      if (updates.filters) {
        Object.entries(updates.filters).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          } else {
            params.delete(key);
          }
        });
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams, pageKey, pageSizeKey, defaultPageSize],
  );

  const setPage = useCallback(
    (newPage: number) => {
      updateUrl({ page: newPage });
    },
    [updateUrl],
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      updateUrl({ pageSize: newPageSize, page: 1 });
    },
    [updateUrl],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      updateUrl({ filters: { [key]: value }, page: 1 });
    },
    [updateUrl],
  );

  const setFilters = useCallback(
    (newFilters: Record<string, string | undefined>) => {
      updateUrl({ filters: newFilters, page: 1 });
    },
    [updateUrl],
  );

  const resetToPage = useCallback(
    (newPage: number = 1) => {
      updateUrl({ page: newPage });
    },
    [updateUrl],
  );

  return {
    page,
    pageSize,
    filters,
    setPage,
    setPageSize,
    setFilter,
    setFilters,
    resetToPage,
  };
}
