import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeleteRequestStatus = "pending" | "approved" | "rejected";

export interface DeleteAccountRequest {
  // From delete_account_requests table
  id: string;
  created_at: string;
  user_id: string;
  email: string;
  reason: string | null;
  status: DeleteRequestStatus;
  // Joined from user_profiles
  first_name: string;
  last_name: string;
  phone_number: string | null;
  sex: string | null;
}

export interface DeleteAccountRequestsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface DeleteAccountRequestsResult {
  requests: DeleteAccountRequest[];
  meta: DeleteAccountRequestsMeta;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const DELETE_REQUEST_KEYS = {
  all: ["delete-account-requests"] as const,
  lists: () => [...DELETE_REQUEST_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string; status?: string }) =>
    [...DELETE_REQUEST_KEYS.lists(), { ...params }] as const,
};

// ─── Fetch hook ───────────────────────────────────────────────────────────────

export const useDeleteAccountRequests = ({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string; // filter by status: "pending" | "approved" | "rejected" | undefined (all)
}) => {
  return useQuery({
    queryKey: DELETE_REQUEST_KEYS.list({ page, limit, search, status }),
    queryFn: async (): Promise<DeleteAccountRequestsResult> => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Base query — always order pending first, then by created_at desc
      let query = supabase
        .from("delete_account_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      // Client-side search is fine at this scale; for larger datasets add
      // a server-side ilike filter on email here
      const { data: rawRequests, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const requests = rawRequests ?? [];
      const total = count ?? 0;

      if (requests.length === 0) {
        return { requests: [], meta: { total: 0, totalPages: 0, currentPage: page } };
      }

      // ── Join user_profiles ──────────────────────────────────────────────
      const userIds = requests.map((r) => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, phone_number, sex")
        .in("user_id", userIds);

      if (profileError) {
        console.warn("Could not fetch user profiles:", profileError.message);
      }

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      const enriched: DeleteAccountRequest[] = requests.map((req) => {
        const profile = profileMap.get(req.user_id);
        return {
          id: req.id,
          created_at: req.created_at,
          user_id: req.user_id,
          email: req.email,
          reason: req.reason ?? null,
          status: req.status as DeleteRequestStatus,
          first_name: profile?.first_name ?? "Unknown",
          last_name: profile?.last_name ?? "Unknown",
          phone_number: profile?.phone_number ?? null,
          sex: profile?.sex ?? null,
        };
      });

      // Apply optional search client-side
      const filtered = search
        ? enriched.filter((r) => {
            const q = search.toLowerCase();
            return (
              r.first_name.toLowerCase().includes(q) ||
              r.last_name.toLowerCase().includes(q) ||
              r.email.toLowerCase().includes(q) ||
              (r.phone_number ?? "").toLowerCase().includes(q)
            );
          })
        : enriched;

      return {
        requests: filtered,
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 30 * 1000, // 30 s — admin view, near-real-time is fine
    placeholderData: (prev) => prev, // keep previous data while refetching
  });
};

// ─── Update status mutation ──────────────────────────────────────────────────

interface UpdateStatusPayload {
  requestId: string;
  userId: string;
  newStatus: DeleteRequestStatus;
}

export const useUpdateDeleteRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, userId, newStatus }: UpdateStatusPayload) => {
      // 1. Update request status
      const { error: reqError } = await supabase
        .from("delete_account_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (reqError) throw new Error(reqError.message);

      // 2. If approving: ban user in BetterAuth + soft-delete profile
      if (newStatus === "approved") {
        const [{ error: banError }, { error: profileError }] = await Promise.all([
          supabase.from("user").update({ banned: true }).eq("id", userId),
          supabase.from("user_profiles").update({ is_deleted: true }).eq("user_id", userId),
        ]);

        if (banError) console.warn("Could not ban user:", banError.message);
        if (profileError) console.warn("Could not soft-delete profile:", profileError.message);
      }

      return { requestId, userId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: DELETE_REQUEST_KEYS.all });
      const msg =
        newStatus === "approved"
          ? "Request approved — user access revoked."
          : newStatus === "rejected"
          ? "Request rejected."
          : "Status updated.";
      toast.success(msg);
    },
    onError: (err: Error) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });
};
