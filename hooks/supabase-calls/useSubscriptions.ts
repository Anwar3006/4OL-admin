/**
 * Marketing subscription hooks — Gap Analysis Part M Phase 3 retrofit.
 *
 * `useMarketingSubscriptions` etc. manage the PLAN CATALOG
 * (marketing_subscriptions) via /api/marketing/plans. The new subscriber
 * hooks (user_subscriptions, M-D5) use /api/marketing/subscribers.
 * Everything is RBAC-guarded server-side now — no client Supabase.
 */

import { apiFetch } from "@/lib/api-fetch";
import {
  TMarketingSubscriptionInput,
  TMarketingSubscriptionOutput,
} from "@/schemas/marketing-subscription.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaginatedResponse {
  data: TMarketingSubscriptionOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

type MarketingSubscriptionRow = {
  id: string;
  name: string;
  description: string | null;
  tier_type: string;
  price: number;
  period: TMarketingSubscriptionOutput["period"];
  billing_cycle: TMarketingSubscriptionOutput["billingCycle"];
  privileges: TMarketingSubscriptionOutput["privileges"] | null;
  tier_limit: number | null;
  is_active: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  subscribers?: number;
  active_subscribers?: number;
};

type SubscriptionPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  activeOnly?: boolean;
};

export const MARKETING_SUBSCRIPTION_QUERY_KEYS = {
  all: ["marketing-subscriptions"] as const,
  lists: () => [...MARKETING_SUBSCRIPTION_QUERY_KEYS.all, "lists"] as const,
  list: (params: SubscriptionPaginationInput) =>
    [...MARKETING_SUBSCRIPTION_QUERY_KEYS.lists(), params] as const,
  details: () => [...MARKETING_SUBSCRIPTION_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) =>
    [...MARKETING_SUBSCRIPTION_QUERY_KEYS.details(), id] as const,
  subscribers: (params: Record<string, unknown>) =>
    [...MARKETING_SUBSCRIPTION_QUERY_KEYS.all, "subscribers", params] as const,
};

const mapSubscriptionRow = (
  row: MarketingSubscriptionRow,
): TMarketingSubscriptionOutput => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  tierType: row.tier_type,
  price: Number(row.price ?? 0),
  period: row.period,
  billingCycle: row.billing_cycle,
  privileges: row.privileges ?? [],
  tierLimit: row.tier_limit ?? 0,
  isActive: row.is_active ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const buildSubscriptionPayload = (
  data: Partial<TMarketingSubscriptionInput>,
) => ({
  name: data.name,
  description: data.description,
  tier_type: data.tierType,
  price: data.price,
  period: data.period,
  billing_cycle: data.billingCycle,
  privileges: data.privileges,
  tier_limit: data.tierLimit,
  is_active: data.isActive,
});

export const useMarketingSubscriptions = ({
  page = 1,
  limit = 100,
  search,
  activeOnly = false,
}: Partial<SubscriptionPaginationInput> = {}) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.list({
      page,
      limit,
      search,
      activeOnly,
    }),
    queryFn: async () => {
      const result = await apiFetch<{ data: MarketingSubscriptionRow[] }>(
        "/api/marketing/plans",
      );
      let rows = result.data ?? [];
      if (search) {
        const needle = search.toLowerCase();
        rows = rows.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) ||
            (row.description ?? "").toLowerCase().includes(needle),
        );
      }
      if (activeOnly) rows = rows.filter((row) => row.is_active !== false);

      const total = rows.length;
      const from = (page - 1) * limit;
      return {
        data: rows.slice(from, from + limit).map(mapSubscriptionRow),
        meta: {
          totalPages: Math.max(1, Math.ceil(total / limit)),
          total,
          currentPage: page,
        },
      };
    },
  });
};

export const useMarketingSubscription = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery<TMarketingSubscriptionOutput, Error>({
    queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const result = await apiFetch<{ data: MarketingSubscriptionRow }>(
        `/api/marketing/plans/${id}`,
      );
      return mapSubscriptionRow(result.data);
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

export const useCreateMarketingSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TMarketingSubscriptionOutput,
    Error,
    TMarketingSubscriptionInput
  >({
    mutationFn: async (data) => {
      const result = await apiFetch<{ data: MarketingSubscriptionRow }>(
        "/api/marketing/plans",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSubscriptionPayload(data)),
        },
      );
      return mapSubscriptionRow(result.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
      });
      toast.success("Subscription created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create subscription: ${error.message}`);
    },
  });
};

export const useUpdateMarketingSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TMarketingSubscriptionOutput,
    Error,
    { id: string; data: Partial<TMarketingSubscriptionInput> }
  >({
    mutationFn: async ({ id, data: input }) => {
      const result = await apiFetch<{ data: MarketingSubscriptionRow }>(
        `/api/marketing/plans/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSubscriptionPayload(input)),
        },
      );
      return mapSubscriptionRow(result.data);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.detail(result.id),
        }),
      ]);
      toast.success("Subscription updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
};

export const useDeleteMarketingSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiFetch<{ ok: boolean }>(`/api/marketing/plans/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
        }),
        queryClient.removeQueries({
          queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.detail(id),
        }),
      ]);
      toast.success("Subscription deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete subscription: ${error.message}`);
    },
  });
};

// =============== Subscribers (user_subscriptions — M-D5) ============

export type TUserSubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "at_risk" | "cancelled" | "expired";
  subscribed_at: string;
  next_renewal_at: string | null;
  payment_method: string | null;
  auto_renew: boolean;
  risk_reason: string | null;
  last_reminded_at: string | null;
  cancelled_at: string | null;
  marketing_subscriptions: {
    id: string;
    name: string;
    price: number;
    billing_cycle: string;
  } | null;
  user_profiles: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_number: string | null;
  } | null;
};

export const useMarketingSubscribers = ({
  page,
  limit,
  status,
  plan,
}: {
  page: number;
  limit: number;
  status?: string;
  plan?: string;
}) => {
  return useQuery<
    {
      data: TUserSubscriptionRow[];
      meta: { totalPages: number; total: number; currentPage: number };
    },
    Error
  >({
    queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.subscribers({ page, limit, status, plan }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      return apiFetch(`/api/marketing/subscribers?${params.toString()}`);
    },
  });
};

export const useRemindSubscribers = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { ids?: string[]; at_risk?: boolean }>({
    mutationFn: async (payload) => {
      await apiFetch<{ ok: boolean }>("/api/marketing/subscribers/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
      });
      toast.success("Reminders queued!");
    },
    onError: (error) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });
};
