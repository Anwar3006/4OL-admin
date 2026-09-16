"use client";

/**
 * Client-side pagination for the Trivia tab's tables.
 *
 * Every table there renders its whole array. That was survivable while the
 * data was test-sized, but leads, rankings and fulfillment all grow once per
 * entry per event -- and the lead register was already capping itself at
 * `.slice(0, 20)`, silently hiding the rest with nothing on screen to say so.
 *
 * Client-side rather than server-side on purpose: /api/period/data already
 * returns these arrays whole in one round trip (they are derived from each
 * other -- rankings join submissions join leads), so paging them here costs
 * no extra Accra-to-eu-west-1 hop. If any of these grows past a few thousand
 * rows, that is the point to move it into the server's pageRows() helper.
 */

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const TRIVIA_PAGE_SIZE = 10;

export function usePaged<T>(rows: T[], pageSize = TRIVIA_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // A refetch can shrink the list under the current page -- deleting the last
  // tier on page 3, say -- which would otherwise render an empty table with
  // no way back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (Math.min(page, totalPages) - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, totalPages, pageSize]);

  return { page, setPage, pageRows, total, totalPages, pageSize };
}

export function Pager({
  page,
  totalPages,
  total,
  pageSize = TRIVIA_PAGE_SIZE,
  onPageChange,
  label,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the count line, e.g. "leads". */
  label: string;
}) {
  // One page of results needs no controls, but the count still orients the
  // reader -- "3 leads" reads very differently from a table you assume is cut.
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
      <span className="text-2xs text-slate-500">
        {total <= pageSize
          ? `${total} ${label}`
          : `Showing ${first}–${last} of ${total} ${label}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1" role="group" aria-label={`${label} pagination`}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label={`Previous page of ${label}`}
          >
            ‹
          </button>
          <span className="px-2 text-2xs tabular-nums text-slate-600 dark:text-slate-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={cn("btn btn-secondary btn-sm")}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label={`Next page of ${label}`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
