/**
 * Pass-upgrade-request hooks — moved from
 * features/marketing/data/useSubscriptions.ts as part of the subscriptions
 * consolidation. Calls app/api/subscriptions/requests/route.ts, which is
 * UNCHANGED and mobile-contracted (tests/contract/mobile-contract.ts,
 * consumer hooks/use-subscription-upgrade.ts in the Expo app) — this hook
 * only reads/writes that existing route, it does not touch its shape.
 */

import { apiFetch } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type TUpgradeRequestRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  pass_type: "all_access" | "fitness_only" | "plasence_only";
  tier_key: string;
  note: string | null;
  status: "pending" | "fulfilled" | "declined" | "cancelled";
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decline_reason: string | null;
};

export const UPGRADE_REQUEST_QUERY_KEY = (status: string) =>
  ["subscription-upgrade-requests", status] as const;

export const useUpgradeRequests = (status: string = "pending") => {
  return useQuery<{ requests: TUpgradeRequestRow[]; total: number }, Error>({
    queryKey: UPGRADE_REQUEST_QUERY_KEY(status),
    queryFn: async () =>
      apiFetch(`/api/subscriptions/requests?status=${encodeURIComponent(status)}`),
  });
};

export const useReviewUpgradeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { requestId: string; action: "fulfill" | "decline"; durationDays?: number; reason?: string }
  >({
    mutationFn: async (payload) => {
      await apiFetch("/api/subscriptions/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (_, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["subscription-upgrade-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["subscriptions-subscribers"] }),
      ]);
      toast.success(payload.action === "fulfill" ? "Request fulfilled" : "Request declined");
    },
    onError: (error) => {
      toast.error(`Failed to review request: ${error.message}`);
    },
  });
};
