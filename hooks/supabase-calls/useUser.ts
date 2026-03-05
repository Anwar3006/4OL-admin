import { supabase } from "@/lib/supabase";
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
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const admin = params.admin || false;

      // 1. Build the Base Query with Join
      // We join 'users' table (via Better Auth) using foreign key 'user_id'
      let query = supabase.from("user_profiles").select(
        `
          *,
          user:user (
            id,
            name,
            email,
            created_at
          )
        `,
        { count: "exact" },
      );

      // 2. Role Condition
      if (admin) {
        query = query.in("role", ["admin", "super_admin", "registrar"]);
      } else {
        query = query.eq("role", "user");
      }
      
      // 2.5 User Type Filter
      if (params.userType) {
        query = query.eq("user_type", params.userType);
      }

      // 3. Status Filter
      if (params.status) {
        query = query.eq("status", params.status);
      }

      // 4. Search Filter (ILike across multiple columns)
      if (params.search) {
        query = query.or(
          `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone_number.ilike.%${params.search}%`,
        );
      }

      const { data, count, error } = await query
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      console.log("Hooksss: ", data, count);

      const statsQuery = supabase.from("user_profiles").select("status");
      const { data: statsData } = admin
        ? await statsQuery.in("role", ["admin", "super_admin", "registrar"])
        : await statsQuery.eq("role", "user");

      const analytics = (statsData || []).reduce(
        (acc, curr) => {
          if (curr.status in acc) acc[curr.status as keyof typeof acc]++;
          return acc;
        },
        { active: 0, pending: 0, inactive: 0, suspended: 0 },
      );

      const userData = data?.map((user) => ({ ...user, ...user.user }));

      return {
        users: userData as any[],
        meta: {
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page,
        },
        analytics,
      };
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
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          user:user (
            id,
            name,
            email,
            image,
            email_verified
          )
        `,
        )
        .eq("user_id", id) // Use user_id if that's your FK to Better Auth
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("User not found");

      // Flatten the join so the UI gets a consistent object
      return { ...data, ...data.user } as TUserProfile;
    },
  });
};

export const useGetInvitedAdmin = ({ token }: { token: string }) => {
  return useQuery<any, Error>({
    queryKey: USER_QUERY_KEYS.invites,
    queryFn: async () => {
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
    onError: (error) => {
      toast.error(`Failed to create user profile: ${error.message}`);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<TUserProfileRegistrationInput, Error, any>({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
