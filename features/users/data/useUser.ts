import { getUsers, getProfileById } from "@/actions/user.actions";
import { getBrowserClient } from "@/lib/db/browser";
import { getAdminClient } from "@/lib/db/admin";
import type {
  TAdminInviteSchema,
  TUserProfile,
  TUserProfileRegistrationInput,
} from "@/schemas/user-profile.schema";
import type { Database } from "@/lib/db/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Full user_profiles row as returned by getProfileById, plus the resolved
 * email/name and the server's masking marker. The generated Row type is the
 * source of truth for the 43 columns; the flag_* columns are written at runtime
 * by flagUserProfile but are missing from the generated types (type drift), so
 * they are declared here to keep the detail modal fully typed.
 */
export type TUserDetail = Database["public"]["Tables"]["user_profiles"]["Row"] & {
  email?: string | null;
  name?: string;
  full_name?: string | null;
  is_flagged?: boolean | null;
  flag_reason?: string | null;
  flagged_at?: string | null;
  flagged_by?: string | null;
  /** true when the server masked PHI because the caller is not super_admin. */
  _masked?: boolean;
};

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
  return useQuery<TUserDetail, Error>({
    queryKey: USER_QUERY_KEYS.detail(id),
    // Only run the query if an ID actually exists
    enabled: enabled && !!id,
    queryFn: async () => {
      // FIX: fetch the TARGET user's profile by id, not the logged-in admin's
      // own profile. getUserProfile() ignored `id` and returned the caller's
      // row, so every user's modal showed the admin's own role (super_admin)
      // and unmasked PHI. getProfileById(id) is role-gated to super_admin/admin
      // and masks identifiers server-side based on the caller's role.
      const { data, error } = await getProfileById(id);

      if (error) throw new Error(error);
      if (!data) throw new Error("User not found");

      return data as TUserDetail;
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
      const supabase = await getBrowserClient();
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
      const supabase = await getBrowserClient();
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
      const supabase = await getBrowserClient();
      const { data: result, error } = await supabase
        .from("user_profiles")
        .insert({
          user_id: data.userId,
          first_name: data.firstName,
          last_name: data.lastName,
          sex: data.sex,
          dob: data.dob,
          // role and account type are not written from the browser
          // (PLAN.md P0-05): the DB guard only lets admins change them, and
          // user_type becomes read-only. Use the admin users API instead.
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
      const supabase = await getBrowserClient();
      const { data: result, error } = await supabase
        .from("user_profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          sex: data.sex,
          dob: data.dob,
          // role and account type: see useCreateUserProfile above.
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

// ── Admin invitations ─────────────────────────────────────────────────────
// user_invites is shared between admin invites and any other invite_type,
// so every query here is scoped to admin/super_admin/registrar roles —
// matching get_admin_dashboard_metrics's own admin_roles filter.
const ADMIN_INVITE_ROLES = ["admin", "super_admin", "registrar"];

export interface AdminInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invited_by: string | null;
  used_at: string | null;
  used_by: string | null;
  is_revoked: boolean | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

interface AdminInvitesPagination {
  page?: number;
  limit?: number;
}

interface AdminInvitesResponse {
  invites: AdminInvite[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

export const useAdminInvites = (params: AdminInvitesPagination = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 10;

  return useQuery<AdminInvitesResponse, Error>({
    queryKey: [...USER_QUERY_KEYS.invites, "list", page, limit],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("user_invites")
        .select("*", { count: "exact" })
        .in("role", ADMIN_INVITE_ROLES)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const total = count || 0;
      return {
        invites: (data || []) as AdminInvite[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

export const useRevokeAdminInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; revokedBy: string }>({
    mutationFn: async ({ id, revokedBy }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase
        .from("user_invites")
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.invites });
      toast.success("Invitation revoked.");
    },
    onError: (error) => {
      toast.error(`Failed to revoke invitation: ${error.message}`);
    },
  });
};
