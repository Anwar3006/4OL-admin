/**
 * Marketing subscription hooks — Gap Analysis Part M Phase 3 retrofit,
 * rebased by the marketing unification build.
 *
 * `useMarketingSubscriptions` etc. manage the PLAN CATALOG — now
 * `subscription_tiers` via /api/marketing/plans, the SAME catalog the
 * mobile paywall and get_my_entitlement() consume. Subscriber hooks
 * (user_subscriptions, M-D5) use /api/marketing/subscribers. Everything
 * is RBAC-guarded server-side — no client Supabase.
 */

import { apiFetch } from "@/lib/api-fetch";
import {
  TMarketingSubscriptionInput,
  TMarketingSubscriptionOutput,
} from "@/features/marketing/schema/subscription";
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
  key: string;
  name: string;
  description: string | null;
  price_ghs: number;
  duration_days: number | null;
  benefits: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
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

const PERIOD_FROM_DAYS = (days: number | null): TMarketingSubscriptionOutput["period"] => {
  if (days === null) return "Lifetime";
  if (days <= 3) return "3days";
  if (days <= 7) return "7days";
  if (days <= 15) return "0.5month";
  if (days <= 45) return "1month";
  if (days <= 120) return "3months";
  if (days <= 270) return "6months";
  return "12months";
};

const DAYS_FROM_PERIOD: Record<string, number | null> = {
  free: null,
  "3days": 3,
  "7days": 7,
  "0.5month": 15,
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "12months": 365,
  Lifetime: null,
};

const mapSubscriptionRow = (
  row: MarketingSubscriptionRow,
): TMarketingSubscriptionOutput => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  tierType: row.key,
  price: Number(row.price_ghs ?? 0),
  period: PERIOD_FROM_DAYS(row.duration_days),
  billingCycle:
    row.duration_days === null ? "one-time" : row.duration_days >= 365 ? "yearly" : "monthly",
  privileges: row.benefits ?? [],
  tierLimit: 0,
  isActive: row.is_active ?? true,
  createdAt: row.created_at,
  updatedAt: row.created_at,
  createdBy: null,
  subscribers: row.subscribers ?? 0,
  active_subscribers: row.active_subscribers ?? 0,
});

const buildSubscriptionPayload = (
  data: Partial<TMarketingSubscriptionInput>,
) => ({
  name: data.name,
  description: data.description,
  price: data.price,
  duration_days:
    DAYS_FROM_PERIOD[data.period ?? ""] !== undefined
      ? DAYS_FROM_PERIOD[data.period ?? ""]
      : 30,
  benefits: data.privileges,
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
    email: string | null;
    phone_number: string | null;
  } | null;
};

export const useMarketingSubscribers = ({
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
    queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.subscribers({
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
      return apiFetch(`/api/marketing/subscribers?${params.toString()}`);
    },
  });
};

// =============== Overview KPIs (get_marketing_overview) ============

export type TMarketingOverview = {
  campaigns: Record<string, number>;
  discounts: { active: number; total_uses_30d: number; avg_discount_pct: number };
  subscribers: {
    premium_users: number;
    at_risk: number;
    retention_pct: number;
    mrr: number;
  };
};

export const useMarketingOverview = () => {
  return useQuery<TMarketingOverview, Error>({
    queryKey: [...MARKETING_SUBSCRIPTION_QUERY_KEYS.all, "overview"],
    queryFn: async () => {
      const result = await apiFetch<{ overview: TMarketingOverview }>(
        "/api/marketing/analytics",
      );
      return result.overview;
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
      await apiFetch(`/api/marketing/subscribers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
      });
      toast.success("Subscriber updated");
    },
    onError: (error) => {
      toast.error(`Failed to update subscriber: ${error.message}`);
    },
  });
};

// =============== Upgrade requests (three scoped passes gap-closure) ============

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
        queryClient.invalidateQueries({ queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all }),
      ]);
      toast.success(payload.action === "fulfill" ? "Request fulfilled" : "Request declined");
    },
    onError: (error) => {
      toast.error(`Failed to review request: ${error.message}`);
    },
  });
};
