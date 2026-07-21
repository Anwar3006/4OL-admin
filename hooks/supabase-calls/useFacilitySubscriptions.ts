import { getSupabaseClient } from "@/lib/supabase";
import {
  TFacilitySubscriptionInput,
  TFacilitySubscriptionOutput,
} from "@/schemas/facility-subscription.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaginatedResponse {
  data: TFacilitySubscriptionOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

type FacilitySubscriptionRow = {
  id: string;
  facility_id: string;
  subscription_id: string;
  status: string;
  started_at: string;
  current_period_end: string | null;
  billing_cycle: string;
  auto_renew: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  facility: {
    facility_name: string | null;
    owner_email: string | null;
  } | null;
  subscription: {
    name: string | null;
    price: number | null;
    privileges: string[] | null;
  } | null;
};

type SubscriptionPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
};

export const FACILITY_SUBSCRIPTION_QUERY_KEYS = {
  all: ["facility-subscriptions"] as const,
  lists: () => [...FACILITY_SUBSCRIPTION_QUERY_KEYS.all, "lists"] as const,
  list: (params: SubscriptionPaginationInput) =>
    [...FACILITY_SUBSCRIPTION_QUERY_KEYS.lists(), params] as const,
  details: () => [...FACILITY_SUBSCRIPTION_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) =>
    [...FACILITY_SUBSCRIPTION_QUERY_KEYS.details(), id] as const,
};

const mapSubscriptionRow = (
  row: FacilitySubscriptionRow,
): TFacilitySubscriptionOutput => ({
  id: row.id,
  facility_id: row.facility_id,
  subscription_id: row.subscription_id,
  status: row.status as any,
  started_at: row.started_at,
  current_period_end: row.current_period_end,
  billing_cycle: row.billing_cycle as any,
  auto_renew: row.auto_renew,
  cancelled_at: row.cancelled_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  facility: row.facility,
  subscription: row.subscription,
});

const buildSubscriptionPayload = (
  data: Partial<TFacilitySubscriptionInput>,
) => ({
  facility_id: data.facility_id,
  subscription_id: data.subscription_id,
  status: data.status,
  started_at: data.started_at,
  current_period_end: data.current_period_end,
  billing_cycle: data.billing_cycle,
  auto_renew: data.auto_renew,
  cancelled_at: data.cancelled_at,
});

export const useFacilitySubscriptions = ({
  page,
  limit,
  search,
  status,
}: SubscriptionPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.list({
      page,
      limit,
      search,
      status,
    }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getSupabaseClient();
      let query = supabase.from("facility_subscriptions").select(
        `
          *,
          facility:facility_profile!inner (
            facility_name,
            owner_email
          ),
          subscription:marketing_subscriptions!inner (
            name,
            price,
            privileges
          )
        `,
        { count: "exact" },
      );

      if (search) {
        query = query.or(
          `facility.facility_name.ilike.%${search}%,facility.owner_email.ilike.%${search}%`,
        );
      }

      if (status) {
        query = query.eq("status", status);
      }

      const result = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (result.error) throw result.error;

      const totalCount = result.count ?? 0;

      return {
        data: ((result.data || []) as FacilitySubscriptionRow[]).map(
          mapSubscriptionRow,
        ),
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
  });
};

export const useFacilitySubscription = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery<TFacilitySubscriptionOutput, Error>({
    queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select(
          `
          *,
          facility:facility_profile!inner (
            facility_name,
            owner_email
          ),
          subscription:marketing_subscriptions!inner (
            name,
            price,
            privileges
          )
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return mapSubscriptionRow(data as FacilitySubscriptionRow);
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

export const useCreateFacilitySubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TFacilitySubscriptionOutput,
    Error,
    TFacilitySubscriptionInput
  >({
    mutationFn: async (data: TFacilitySubscriptionInput) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from("facility_subscriptions")
        .insert(buildSubscriptionPayload(data))
        .select(
          `
          *,
          facility:facility_profile!inner (
            facility_name,
            owner_email
          ),
          subscription:marketing_subscriptions!inner (
            name,
            price,
            privileges
          )
        `,
        )
        .single();

      if (error) throw new Error(error.message);
      return mapSubscriptionRow(result as FacilitySubscriptionRow);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.all,
      });
      toast.success("Facility subscription created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create subscription: ${error.message}`);
    },
  });
};

export const useUpdateFacilitySubscriptionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TFacilitySubscriptionOutput,
    Error,
    { id: string; status: string; cancelled_at?: Date | null }
  >({
    mutationFn: async ({ id, status, cancelled_at }) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from("facility_subscriptions")
        .update({ status, cancelled_at })
        .eq("id", id)
        .select(
          `
          *,
          facility:facility_profile!inner (
            facility_name,
            owner_email
          ),
          subscription:marketing_subscriptions!inner (
            name,
            price,
            privileges
          )
        `,
        )
        .single();

      if (error) throw new Error(error.message);
      return mapSubscriptionRow(result as FacilitySubscriptionRow);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.detail(result.id),
        }),
      ]);
      toast.success("Subscription status updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
};

export const useDeleteFacilitySubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("facility_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.all,
        }),
        queryClient.removeQueries({
          queryKey: FACILITY_SUBSCRIPTION_QUERY_KEYS.detail(id),
        }),
      ]);
      toast.success("Subscription deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete subscription: ${error.message}`);
    },
  });
};
