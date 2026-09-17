"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/**
 * Premium Users / MRR / Retention % / At-Risk — the subscriber slice of
 * get_marketing_overview(), moved here from Marketing's Subscriptions tab.
 * See api/overview.ts for why this is its own route instead of reusing
 * Marketing's /api/marketing/analytics.
 *
 * Shape duplicated from api/overview.ts's TSubscriptionsOverview rather than
 * imported — that module pulls in server-only clients (getAdminClient,
 * requireAdminApiUser), and this file is "use client".
 */
export type TSubscriptionsOverview = {
  premium_users: number;
  at_risk: number;
  retention_pct: number;
  mrr: number;
};

export const useSubscriptionsOverview = () => {
  return useQuery<TSubscriptionsOverview, Error>({
    queryKey: ["subscriptions-overview"],
    queryFn: async () => {
      const result = await apiFetch<{ subscribers: TSubscriptionsOverview }>(
        "/api/subscriptions/overview",
      );
      return result.subscribers;
    },
    staleTime: 60_000,
  });
};
