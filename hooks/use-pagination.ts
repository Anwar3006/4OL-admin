"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface UsePaginationOptions {
  key?: string;
  defaultPage?: number;
  defaultPageSize?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { key = "page", defaultPage = 1, defaultPageSize = 10 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const p = searchParams.get(key);
    return p ? parseInt(p, 10) : defaultPage;
  }, [searchParams, key, defaultPage]);

  const pageSize = useMemo(() => {
    const ps = searchParams.get(`${key}Size`);
    return ps ? parseInt(ps, 10) : defaultPageSize;
  }, [searchParams, key, defaultPageSize]);

  const setPagination = useCallback(
    (newPage: number, newPageSize?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, newPage.toString());
      if (newPageSize) {
        params.set(`${key}Size`, newPageSize.toString());
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, key]
  );

  const onPageChange = useCallback(
    (newPage: number) => {
      setPagination(newPage, pageSize);
    },
    [setPagination, pageSize]
  );

  const onNextPage = useCallback(() => {
    setPagination(page + 1, pageSize);
  }, [page, pageSize, setPagination]);

  const onPreviousPage = useCallback(() => {
    if (page > 1) {
      setPagination(page - 1, pageSize);
    }
  }, [page, pageSize, setPagination]);

  return {
    page,
    pageSize,
    onPageChange,
    onNextPage,
    onPreviousPage,
    setPagination,
  };
}
