/**
 * Plan-catalog hooks — moved from features/marketing/data/useSubscriptions.ts
 * (the `useMarketingSubscription*` family) as part of the subscriptions
 * consolidation. Manages `subscription_tiers` via /api/subscriptions/plans,
 * the SAME catalog the mobile paywall and get_my_entitlement() consume.
 * RBAC-guarded server-side — no client Supabase.
 *
 * features/marketing/ui/discount-dialog.tsx also imports `usePlans` from
 * here (its "Eligible Plans" picker) — a legitimate cross-feature read now
 * that the plan catalog is owned here rather than by Marketing.
 */

import { apiFetch } from "@/lib/api-fetch";
import {
  TMarketingSubscriptionInput,
  TMarketingSubscriptionOutput,
} from "@/features/subscriptions/schema/subscription";
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

type SubscriptionPlanRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_ghs: number;
  duration_days: number | null;
  benefits: string[] | null;
  is_active: boolean;
  display_order: number;
  product_scope: "full_access" | "plasence" | "fitness";
  created_at: string;
  subscribers?: number;
  active_subscribers?: number;
};

type PlanPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  activeOnly?: boolean;
};

export const SUBSCRIPTIONS_PLAN_QUERY_KEYS = {
  all: ["subscriptions-plans"] as const,
  lists: () => [...SUBSCRIPTIONS_PLAN_QUERY_KEYS.all, "lists"] as const,
  list: (params: PlanPaginationInput) =>
    [...SUBSCRIPTIONS_PLAN_QUERY_KEYS.lists(), params] as const,
  details: () => [...SUBSCRIPTIONS_PLAN_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) => [...SUBSCRIPTIONS_PLAN_QUERY_KEYS.details(), id] as const,
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

const mapPlanRow = (row: SubscriptionPlanRow): TMarketingSubscriptionOutput => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  tierType: row.product_scope,
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

const buildPlanPayload = (data: Partial<TMarketingSubscriptionInput>) => ({
  name: data.name,
  description: data.description,
  price: data.price,
  duration_days:
    DAYS_FROM_PERIOD[data.period ?? ""] !== undefined
      ? DAYS_FROM_PERIOD[data.period ?? ""]
      : 30,
  benefits: data.privileges,
  is_active: data.isActive,
  product_scope: data.tierType,
});

export const usePlans = ({
  page = 1,
  limit = 100,
  search,
  activeOnly = false,
}: Partial<PlanPaginationInput> = {}) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.list({ page, limit, search, activeOnly }),
    queryFn: async () => {
      const result = await apiFetch<{ data: SubscriptionPlanRow[] }>(
        "/api/subscriptions/plans",
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
        data: rows.slice(from, from + limit).map(mapPlanRow),
        meta: {
          totalPages: Math.max(1, Math.ceil(total / limit)),
          total,
          currentPage: page,
        },
      };
    },
  });
};

export const usePlan = ({ id, enabled }: { id: string; enabled: boolean }) => {
  return useQuery<TMarketingSubscriptionOutput, Error>({
    queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const result = await apiFetch<{ data: SubscriptionPlanRow }>(
        `/api/subscriptions/plans/${id}`,
      );
      return mapPlanRow(result.data);
    },
    enabled,
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<TMarketingSubscriptionOutput, Error, TMarketingSubscriptionInput>({
    mutationFn: async (data) => {
      const result = await apiFetch<{ data: SubscriptionPlanRow }>("/api/subscriptions/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPlanPayload(data)),
      });
      return mapPlanRow(result.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.all });
      toast.success("Plan created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TMarketingSubscriptionOutput,
    Error,
    { id: string; data: Partial<TMarketingSubscriptionInput> }
  >({
    mutationFn: async ({ id, data: input }) => {
      const result = await apiFetch<{ data: SubscriptionPlanRow }>(
        `/api/subscriptions/plans/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPlanPayload(input)),
        },
      );
      return mapPlanRow(result.data);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.detail(result.id) }),
      ]);
      toast.success("Plan updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiFetch<{ ok: boolean }>(`/api/subscriptions/plans/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.all }),
        queryClient.removeQueries({ queryKey: SUBSCRIPTIONS_PLAN_QUERY_KEYS.detail(id) }),
      ]);
      toast.success("Plan deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete plan: ${error.message}`);
    },
  });
};
