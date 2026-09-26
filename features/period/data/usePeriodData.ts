import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import type { PeriodTabId } from "@/features/period/schema/period-tracker";
import type { PeriodPayload } from "@/features/period/schema/types";

/**
 * Period Tracker read path, on TanStack Query.
 *
 * The workspace used to hand-roll this with `fetch` + `useState` + a debounced
 * `useEffect`; every other feature (facilities, fitness, reviews, medication)
 * already goes through TanStack Query, so this brings the last outlier onto the
 * same cache/invalidation model. Behaviour is preserved deliberately:
 *
 *  - `placeholderData: keepPreviousData` keeps the previous tab/page's payload
 *    on screen while the next one loads — the old code only called `setPayload`
 *    on success, so the stale rows stayed visible during a refetch too.
 *  - `refetchOnWindowFocus: false` matches the old manual-only fetching: the
 *    data was `cache: "no-store"` and refetched solely on tab/page/search
 *    change or an explicit Refresh, never on window focus.
 *
 * The caller debounces the search term before passing it in (see
 * `useDebounce`), exactly as the old 250ms `setTimeout` did.
 */
export const PERIOD_QUERY_KEYS = {
  all: ["period"] as const,
  data: (params: { tab: PeriodTabId; page: number; query: string }) =>
    [...PERIOD_QUERY_KEYS.all, "data", params] as const,
};

export function usePeriodData({
  tab,
  page,
  query,
}: {
  tab: PeriodTabId;
  page: number;
  query: string;
}) {
  return useQuery<PeriodPayload, Error>({
    queryKey: PERIOD_QUERY_KEYS.data({ tab, page, query }),
    queryFn: () => {
      const params = new URLSearchParams({
        tab,
        page: String(page),
        pageSize: "50",
      });
      if (query.trim()) params.set("q", query.trim());
      return apiFetch<PeriodPayload>(`/api/period/data?${params}`);
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
