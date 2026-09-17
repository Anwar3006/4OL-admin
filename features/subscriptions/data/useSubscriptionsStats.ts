"use client";

import { useQuery } from "@tanstack/react-query";

export interface SubscriptionsStats {
  total: number;
  active: number;
  /** New grants created per week, oldest first — real 8-week series. */
  new_grants_trend: number[];
  by_scope: {
    all_access: number;
    fitness_only: number;
    period_only: number;
  };
}

const EMPTY_STATS: SubscriptionsStats = {
  total: 0,
  active: 0,
  new_grants_trend: [],
  by_scope: { all_access: 0, fitness_only: 0, period_only: 0 },
};

/**
 * Powers the Subscriptions overview KPI bento. Rides on the same
 * `/api/subscriptions/admin` GET the entitlements table already calls —
 * `stats` is computed there from rows the handler has already fetched for
 * pagination, so this adds an HTTP round trip but no extra database query.
 */
export const useSubscriptionsStats = () => {
  return useQuery({
    queryKey: ["subscriptions-admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/admin?limit=1", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load subscription stats");
      return (json.stats as SubscriptionsStats | undefined) ?? EMPTY_STATS;
    },
    staleTime: 60_000,
  });
};
