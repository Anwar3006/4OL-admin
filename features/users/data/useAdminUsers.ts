import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Hooks for the Users menu uplift (Gap Analysis Part C). Reads go through
// /api/admin/users which applies server-side PHI masking per caller role.

export interface AdminUserRow {
  user_id: string;
  public_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  email: string | null;
  phone_number: string | null;
  region: string | null;
  status: string | null;
  user_type: string[];
  sex: string | null;
  plan: string;
  engagement_score: number;
  created_at: string;
  last_active: string | null;
}

export interface UserKpiStats {
  total_users: number;
  active_30d: number;
  premium: number;
  nhis_linked: number;
  flagged: number;
  delete_requests_pending: number;
}

export const ADMIN_USERS_KEYS = {
  all: ["admin-users"] as const,
  list: (params: Record<string, unknown>) => ["admin-users", "list", params] as const,
  kpis: ["admin-users", "kpis"] as const,
};

export const useUserKpiStats = () => {
  return useQuery({
    queryKey: ADMIN_USERS_KEYS.kpis,
    queryFn: async () => {
      const res = await fetch("/api/admin/users/kpis", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load user KPIs.");
      return json as { stats: UserKpiStats; source: string };
    },
    staleTime: 5_000,
    refetchInterval: 30_000,
  });
};

export const useAdminUsers = (params: {
  search?: string;
  plan?: string;
  status?: string;
  nhis?: "linked" | "unlinked";
  region?: string;
  sort?: "newest" | "oldest" | "last_active";
  page?: number;
  limit?: number;
}) => {
  const { page = 1, limit = 25, ...rest } = params;
  return useQuery({
    queryKey: ADMIN_USERS_KEYS.list({ ...rest, page, limit }),
    queryFn: async () => {
      const qs = new URLSearchParams({
        limit: String(limit),
        offset: String((page - 1) * limit),
      });
      Object.entries(rest).forEach(([key, value]) => {
        if (value) qs.set(key, String(value));
      });
      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load users.");
      return json as { users: AdminUserRow[]; total: number };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5_000,
    // Profiles are inserted synchronously during sign-up, so a small
    // no-cache interval makes an already-open Users tab reflect a new account
    // within 15 seconds. We intentionally do not subscribe to raw profile
    // rows in the browser: this API is the PHI-masking security boundary.
    refetchInterval: 15_000,
  });
};

// ── Mutations ──────────────────────────────────────────────────────────────

const invalidateUsers = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEYS.all });
  queryClient.invalidateQueries({ queryKey: ["user-dashboard-metrics"] });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      phone?: string;
      plan?: string;
      region?: string;
      note?: string;
    }) => {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send invite.");
      return json as { success: boolean; inviteLink: string; emailSent: boolean };
    },
    onSuccess: () => {
      invalidateUsers(queryClient);
      toast.success("Invitation sent by email.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "active" | "inactive" | "suspended" | "banned";
    }) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status.");
      return json;
    },
    onSuccess: () => {
      invalidateUsers(queryClient);
      toast.success("User status updated.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUpdateUserPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      plan,
    }: {
      userId: string;
      plan: "free" | "standard" | "premium" | "featured";
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change plan.");
      return json;
    },
    onSuccess: () => {
      invalidateUsers(queryClient);
      toast.success("Plan updated.");
    },
    onError: (error) => toast.error(error.message),
  });
};
