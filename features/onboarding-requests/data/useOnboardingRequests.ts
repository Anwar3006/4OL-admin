import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingRequestStatus = "pending" | "approved" | "rejected";
export type OnboardingRequestType = "facility_owner" | "ibp_invite";

export interface OnboardingRequest {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone_number: string | null;
  request_type: OnboardingRequestType;
  status: OnboardingRequestStatus;
  notes: string | null;
  // Written by the mobile app's "Request access" form (RequestLink.tsx):
  // area_name, gps_address, region, delivery_method. Used to pre-fill the
  // Add Facility dialog when a facility_owner request is approved (P0-06) —
  // it's not enough on its own to create a facility_profile row.
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingRequestsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface OnboardingRequestsResult {
  requests: OnboardingRequest[];
  meta: OnboardingRequestsMeta;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const ONBOARDING_REQUEST_KEYS = {
  all: ["onboarding-requests"] as const,
  lists: () => [...ONBOARDING_REQUEST_KEYS.all, "list"] as const,
  list: (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    type?: string;
  }) => [...ONBOARDING_REQUEST_KEYS.lists(), { ...params }] as const,
};

// ─── Fetch hook ───────────────────────────────────────────────────────────────

export const useOnboardingRequests = ({
  page,
  limit,
  search,
  status,
  type,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  type?: string;
}) => {
  return useQuery({
    queryKey: ONBOARDING_REQUEST_KEYS.list({ page, limit, search, status, type }),
    queryFn: async (): Promise<OnboardingRequestsResult> => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getBrowserClient();
      let query = supabase
        .from("onboarding_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (type) query = query.eq("request_type", type);
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      return {
        requests: (data as OnboardingRequest[]) ?? [],
        meta: {
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 30 * 1000,
  });
};

// ─── Mutation hook ────────────────────────────────────────────────────────────

export const useUpdateOnboardingRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: OnboardingRequestStatus;
    }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase
        .from("onboarding_requests")
        .update({ status })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_REQUEST_KEYS.all });
      toast.success("Request status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

export const useDeleteOnboardingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase
        .from("onboarding_requests")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_REQUEST_KEYS.all });
      toast.success("Request deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete request: ${error.message}`);
    },
  });
};
