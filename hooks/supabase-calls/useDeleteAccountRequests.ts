import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { setUserAuthBan } from "@/actions/user.actions";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

// Formalized in supabase/migrations/20260812_epic21_delete_account_status_vocabulary.sql
// as a CHECK constraint — the column previously had none. See that file for
// the full lifecycle description.
export type DeleteRequestStatus =
  | "pending_review"
  | "in_verification"
  | "grace_period"
  | "completed"
  | "cancelled";

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
  list: (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) => [...DELETE_REQUEST_KEYS.lists(), { ...params }] as const,
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

      const supabase = await getSupabaseClient();
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
        return {
          requests: [],
          meta: { total: 0, totalPages: 0, currentPage: page },
        };
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

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

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
    mutationFn: async ({
      requestId,
      userId,
      newStatus,
    }: UpdateStatusPayload) => {
      const supabase = await getSupabaseClient();

      const updatePayload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "grace_period") {
        // Needed by expire_delete_account_grace_periods() to compute when
        // the 30-day window elapses — created_at is when the request was
        // first submitted, not when it entered grace_period, and those
        // can be arbitrarily far apart if in_verification takes a while.
        updatePayload.grace_period_started_at = new Date().toISOString();
      }

      const { error: reqError } = await supabase
        .from("delete_account_requests")
        .update(updatePayload)
        .eq("id", requestId);

      if (reqError) throw new Error(reqError.message);

      // Revoke login access as soon as the request enters its grace
      // period — matches the mobile app's own copy ("Upon approval, your
      // login access will be immediately revoked"). Actual data
      // anonymization/deletion happens later, automatically, once the
      // grace period elapses (expire_delete_account_grace_periods()) —
      // not here, since grace_period is meant to be a reversible window.
      if (newStatus === "grace_period") {
        // setUserAuthBan hits GoTrue's own ban_duration, which blocks every
        // client including mobile. The previous version wrote `banned: true`
        // to the BetterAuth `user` table, which nothing reads — so access was
        // never actually revoked. user_profiles.status is still set because
        // the admin panel reads it (lib/admin-api-auth.ts), but on its own it
        // has no effect on the mobile app.
        const [{ error: banError }, { error: profileError }] =
          await Promise.all([
            setUserAuthBan(userId, true),
            supabase
              .from("user_profiles")
              .update({ status: "banned" })
              .eq("user_id", userId),
          ]);

        if (banError) console.warn("Could not ban user:", banError);
        if (profileError)
          console.warn("Could not update profile status:", profileError.message);
      }

      // The grace period is explicitly reversible, so cancelling has to undo
      // the revocation — otherwise a cancelled request left the user
      // permanently locked out with no way back.
      if (newStatus === "cancelled") {
        const [{ error: unbanError }, { error: profileError }] =
          await Promise.all([
            setUserAuthBan(userId, false),
            supabase
              .from("user_profiles")
              .update({ status: "active" })
              .eq("user_id", userId),
          ]);

        if (unbanError) console.warn("Could not restore access:", unbanError);
        if (profileError)
          console.warn("Could not update profile status:", profileError.message);
      }

      return { requestId, userId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: DELETE_REQUEST_KEYS.all });
      const messages: Record<DeleteRequestStatus, string> = {
        pending_review: "Marked as pending review.",
        in_verification: "Marked as in verification.",
        grace_period: "Grace period started — user access revoked.",
        completed: "Request marked completed.",
        cancelled: "Request cancelled.",
      };
      toast.success(messages[newStatus] ?? "Status updated.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });
};
