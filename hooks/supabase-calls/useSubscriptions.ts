import { supabase } from "@/lib/supabase";
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
};

export const useMarketingSubscriptions = ({
  page,
  limit,
  search,
  activeOnly = false,
}: SubscriptionPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.list({
      page,
      limit,
      search,
      activeOnly,
    }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("marketing_subscriptions")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const result = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (result.error) throw result.error;

      const totalCount = result.count ?? 0;

      return {
        data: result.data as TMarketingSubscriptionOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
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
      const { data, error } = await supabase
        .from("marketing_subscriptions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as TMarketingSubscriptionOutput;
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
    mutationFn: async (data: TMarketingSubscriptionInput) => {
      const inputData = {
        ...data,
        billing_cycle: data.billingCycle,
        max_users: data.maxUsers,
        is_active: data.isActive,
      };

      const { data: result, error } = await supabase
        .from("marketing_subscriptions")
        .insert(inputData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingSubscriptionOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
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
      const inputData = {
        ...input,
        billing_cycle: input.billingCycle,
        max_users: input.maxUsers,
        is_active: input.isActive,
      };

      const { data: result, error } = await supabase
        .from("marketing_subscriptions")
        .update(inputData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingSubscriptionOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
      });
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
      const { error } = await supabase
        .from("marketing_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_SUBSCRIPTION_QUERY_KEYS.all,
      });
      toast.success("Subscription deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete subscription: ${error.message}`);
    },
  });
};
