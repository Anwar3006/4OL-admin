/**
 * Subscriber (user_subscriptions) hooks — moved from
 * features/marketing/data/useSubscriptions.ts as part of the subscriptions
 * consolidation. Logic unchanged, paths repointed at /api/subscriptions/*.
 */

import { apiFetch } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const SUBSCRIBERS_QUERY_KEYS = {
  all: ["subscriptions-subscribers"] as const,
  subscribers: (params: Record<string, unknown>) =>
    [...SUBSCRIBERS_QUERY_KEYS.all, params] as const,
};

export type TUserSubscriptionRow = {
  id: string;
  user_id: string;
  tier_id: string | null;
  status: "active" | "at_risk" | "cancelled" | "expired" | "revoked";
  source: string | null;
  subscribed_at: string;
  starts_at: string | null;
  expires_at: string | null;
  next_renewal_at: string | null;
  payment_method: string | null;
  auto_renew: boolean;
  risk_reason: string | null;
  last_reminded_at: string | null;
  cancelled_at: string | null;
  subscription_tiers: {
    id: string;
    key: string;
    name: string;
    price_ghs: number;
    duration_days: number | null;
  } | null;
  user_profiles: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
  } | null;
};

export const useSubscribers = ({
  page,
  limit,
  status,
  plan,
  paymentMethod,
  renewBefore,
}: {
  page: number;
  limit: number;
  status?: string;
  plan?: string;
  paymentMethod?: string;
  renewBefore?: string;
}) => {
  return useQuery<
    {
      data: TUserSubscriptionRow[];
      meta: { totalPages: number; total: number; currentPage: number };
    },
    Error
  >({
    queryKey: SUBSCRIBERS_QUERY_KEYS.subscribers({
      page,
      limit,
      status,
      plan,
      paymentMethod,
      renewBefore,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      if (paymentMethod) params.set("payment_method", paymentMethod);
      if (renewBefore) params.set("renew_before", renewBefore);
      return apiFetch(`/api/subscriptions/subscribers?${params.toString()}`);
    },
  });
};

export const useRemindSubscribers = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { ids?: string[]; at_risk?: boolean }>({
    mutationFn: async (payload) => {
      await apiFetch<{ ok: boolean }>("/api/subscriptions/subscribers/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_QUERY_KEYS.all });
      toast.success("Reminders queued!");
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });
};

export const useUpdateSubscriber = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    {
      id: string;
      data: {
        status?: "active" | "at_risk" | "cancelled" | "expired";
        auto_renew?: boolean;
        risk_reason?: string | null;
      };
    }
  >({
    mutationFn: async ({ id, data }) => {
      await apiFetch(`/api/subscriptions/subscribers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_QUERY_KEYS.all });
      toast.success("Subscriber updated");
    },
    onError: (error) => {
      toast.error(`Failed to update subscriber: ${error.message}`);
    },
  });
};
