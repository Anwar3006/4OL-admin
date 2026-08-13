import { getUsers, getUserProfile } from "@/actions/user.actions";
import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  TAdminInviteSchema,
  TUserProfile,
  TUserProfileRegistrationInput,
} from "@/schemas/user-profile.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Pagination {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  userType?: string;
  admin: boolean;
}

interface PaginationResponse {
  users: TUserProfile[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  analytics: {
    active: number;
    pending: number;
    inactive: number;
    suspended: number;
  };
}

export const USER_QUERY_KEYS = {
  all: ["users"] as const,
  invites: ["invites"] as const,
  lists: () => [...USER_QUERY_KEYS.all, "list"] as const,
  list: (params: Pagination) => [...USER_QUERY_KEYS.lists(), params] as const,
  details: () => [...USER_QUERY_KEYS.all, "details"] as const,
  detail: (userId: string) => [...USER_QUERY_KEYS.all, userId] as const,
};

//================= Query Hooks ==============
export const useUsers = (params: Pagination) => {
  return useQuery<PaginationResponse, Error>({
    queryKey: USER_QUERY_KEYS.list(params),
    queryFn: async () => {
      const limit = params.limit || 10;
      const page = params.page || 1;
      const admin = params.admin || false;

      // 1. Build the Base Query with Join
      // We join 'users' table (via Better Auth) using foreign key 'user_id'
      return await getUsers({
        page,
        limit,
        admin,
        status: params.status,
        search: params.search,
        userType: params.userType,
      });
    },
    enabled: true,
  });
};

export const useUser = ({ id, enabled }: { id: string; enabled: boolean }) => {
  return useQuery<TUserProfile, Error>({
    queryKey: USER_QUERY_KEYS.detail(id),
    // Only run the query if an ID actually exists
    enabled: enabled,
    queryFn: async () => {
      const { data, error } = await getUserProfile();

      if (error) throw new Error(error);
      if (!data) throw new Error("User not found");

      return data as TUserProfile;
    },
  });
};

export interface UserDashboardMetrics {
  time_filter: string;
  total: number;
  active: number;
  new_users: number;
  deleted: number;
  pending_verification: number;
  suspended: number;
  banned: number;
  with_push_token: number;
  fitness_onboarding_rate: number;
  premium: number;
  flagged: number;
  delete_requests_pending: number;
  by_type: Record<string, number>;
  by_sex: Record<string, number>;
}

export const useUserDashboardMetrics = (period: "24h" | "7d" | "30d" | "90d" = "30d") => {
  return useQuery<UserDashboardMetrics, Error>({
    queryKey: ["user-dashboard-metrics", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard-metrics/users?period=${period}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load user dashboard metrics.");
      return res.json();
    },
  });
};

export const useGetInvitedAdmin = ({ token }: { token: string }) => {
  return useQuery<any, Error>({
    queryKey: USER_QUERY_KEYS.invites,
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("user_invites")
        .select()
        .eq("token", token)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useRegistrarTrails = (daysBack: number = 1) => {
  return useQuery({
    queryKey: ["registrar_trails", daysBack],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_registrar_trails", {
        days_back: daysBack,
      });
      if (error) throw error;
      return data;
    },
  });
};

//================= Mutation Hooks ==============
export const useCreateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<TUserProfileRegistrationInput, Error, any>({
    mutationFn: async (data: TUserProfileRegistrationInput) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from("user_profiles")
        .insert({
          user_id: data.userId,
          first_name: data.firstName,
          last_name: data.lastName,
          sex: data.sex,
          dob: data.dob,
          user_type: data.userType,
          role: data.role,
          phone_number: data.phoneNumber,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.all,
      });
      toast.success("User profile created successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to create user profile: ${error.message}`);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<TUserProfileRegistrationInput, Error, any>({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from("user_profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          sex: data.sex,
          dob: data.dob,
          user_type: data.user_type,
          role: data.role,
          phone_number: data.phone_number,
        })
        .eq("user_id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.detail(data.userId as string),
      });
      toast.success("User profile updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update user profile: ${error.message}`);
    },
  });
};
