import { getBrowserClient } from "@/lib/db/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FACILITY_PROFILE_QUERY_KEYS } from "@/features/facilities/data/useFacilities";

export interface FacilityRatingRow {
  id: string;
  comment_text: string;
  rating: number;
  status?: "pending" | "approved" | "rejected" | string;
  is_published: boolean;
  is_verified_visit: boolean;
  helpful_count: number;
  created_at: string;
  user_profiles: {
    user_id?: string;
    name: string;
    email?: string;
  };
  facility_profile: {
    id?: string;
    facility_name: string;
  };
  [key: string]: any;
}

export interface ReviewKpiStats {
  total_reviews: number;
  total_delta: number | null;
  average_rating: number;
  pending_reviews: number;
  pending_delta: number | null;
  approved_reviews: number;
  approved_delta: number | null;
  rejected_reviews: number;
  rejected_delta: number | null;
  flagged_reviews: number | null;
  flagged_delta: number | null;
}

export interface FacilityDashboardMetrics {
  facilities: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  by_type: Array<{ type: string; count: number }>;
  by_region: Array<{ region: string; count: number }>;
  reviews: {
    total: number;
    approved: number;
    average_rating: number;
    top_rated_count: number;
    has_review_data: boolean;
  };
  favorites_total: number;
  active_offerings_total: number;
  deltas: Record<string, any>;
}

// Senior Approach: This replaces the old `fetchFacilityRatings` service.
// Powers the All Reviews / Flagged (rejected) / Pending tabs on the Reviews
// admin page — same query shape, filtered by `status` so all three tabs
// share one hook — paginated, searchable, and joined against the reviewer +
// facility for display.
export const useFacilityRatingsList = ({
  pageIndex,
  pageSize = 10,
  search = "",
  status,
}: {
  pageIndex: number;
  pageSize?: number;
  search?: string;
  status?: "pending" | "approved" | "rejected";
}) => {
  return useQuery({
    queryKey: ["facility-ratings-list", pageIndex, pageSize, search, status],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("facility_reviews")
        .select(
          `
          id,
          comment_text,
          rating,
          status,
          is_verified_visit,
          helpful_count,
          created_at,
          user_profiles (
            user_id,
            first_name,
            last_name
          ),
          facility_profile (
            id,
            facility_name
          )
        `,
          { count: "exact" },
        );

      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.or(
          `comment_text.ilike.%${search}%,facility_profile.facility_name.ilike.%${search}%`,
        );
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Format the result to match the shape the reviews table expects.
      const ratings: FacilityRatingRow[] = (data || []).map((item: any) => ({
        ...item,
        user_profiles: {
          user_id: item.user_profiles?.user_id,
          name:
            `${item.user_profiles?.first_name || ""} ${item.user_profiles?.last_name || ""}`.trim() ||
            "Anonymous",
          email: item.user_profiles?.email,
        },
        facility_profile: {
          id: item.facility_profile?.id,
          facility_name: item.facility_profile?.facility_name || "N/A",
        },
      }));

      return { ratings, count: count || 0 };
    },
    placeholderData: (previousData) => previousData,
  });
};

// Senior Approach: Powers the KPI cards on the Reviews admin page via the
// `get_review_kpi_stats` Postgres RPC (see KPIs.sql) — current vs prior
// 30-day totals/pending/flagged counts with % deltas computed server-side.
export const useReviewKpiStats = () => {
  return useQuery({
    queryKey: ["review-kpi-stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_review_kpi_stats");

      if (error) throw error;

      return data as ReviewKpiStats;
    },
  });
};

export const useFacilityDashboardMetrics = (timeFilter: "7" | "30" | "90" | "year" = "30") => {
  return useQuery({
    queryKey: ["facility-dashboard-metrics", timeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/facility-metrics?timeFilter=${timeFilter}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load facility metrics");
      }

      const { metrics } = await res.json();
      return metrics as FacilityDashboardMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useReviews = ({ facilityId }: { facilityId: string }) => {
  return useQuery({
    queryKey: ["facility-reviews", facilityId],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("facility_reviews")
        .select(
          `
          *,
          user:user_profiles (
            first_name,
            last_name,
            role
          )
        `,
        )
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Senior Approach: Transform the flat list into a threaded structure
      // (1-level deep) before returning it to the UI.
      const parents = data.filter((r) => !r.parent_id);
      const replies = data.filter((r) => r.parent_id);

      return parents.map((p) => ({
        ...p,
        replies: replies.filter((r) => r.parent_id === p.id),
      }));
    },
    enabled: !!facilityId,
  });
};

export const useAdminFacilityAudit = ({
  facilityId,
  adminId,
}: {
  facilityId: string;
  adminId: string;
}) => {
  return useQuery({
    queryKey: ["facility-admin-audit", facilityId, adminId],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      // 1. Parallel fetch for Summary Data and Admin-Specific Reviews
      const [summaryRes, countRes, reviewsRes] = await Promise.all([
        supabase
          .from("facility_profile")
          .select("avg_rating")
          .eq("id", facilityId)
          .single(), // Get the specific facility's current average

        supabase
          .from("facility_reviews")
          .select("id", { count: "exact", head: true }) // head: true only gets count, no rows
          .eq("facility_id", facilityId),

        supabase
          .from("facility_reviews")
          .select(
            `
            *,
            user:user_profiles (
              first_name,
              last_name,
              role
            )
          `,
          )
          .eq("facility_id", facilityId)
          .eq("user_id", adminId)
          .order("created_at", { ascending: false }),
      ]);

      if (reviewsRes.error) throw reviewsRes.error;

      // 2. Return a unified object for the UI
      return {
        myReviews: reviewsRes.data || [],
        summary: {
          avgRating: summaryRes.data?.avg_rating || 0,
          totalReviews: countRes.count || 0,
        },
      };
    },
    enabled: !!facilityId && !!adminId,
  });
};

export const usePerformFacilityReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      facilityId,
      isTopRated,
      comment,
      rating = null, // Default to null for Admin Audit notes
      parentId = null,
    }: {
      adminId: string;
      facilityId: string;
      isTopRated: boolean;
      comment: string | null;
      rating?: number | null;
      parentId?: string | null;
    }) => {
      console.log("Called with rating: ", rating);
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc(
        "admin_perform_facility_review_action",
        {
          p_admin_id: adminId,
          p_facility_id: facilityId,
          p_is_top_rated: isTopRated,
          p_comment_text: comment,
          p_rating: rating || null,
          p_parent_id: parentId,
        },
      );

      if (error) throw error;
    },
    // OPTIMISTIC UPDATE LOGIC
    onMutate: async (variables) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["facility-profile", variables.facilityId],
      });

      // Snapshot the previous value
      const previousFacility = queryClient.getQueryData([
        "facility-profile",
        variables.facilityId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData(
        ["facility-profile", variables.facilityId],
        (old: any) => ({
          ...old,
          is_top_rated: variables.isTopRated,
        }),
      );

      return { previousFacility };
    },
    onSuccess: (_, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ["facility-profile", variables.facilityId],
      });
      queryClient.invalidateQueries({
        queryKey: ["facility-reviews", variables.facilityId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "facility-admin-audit",
          variables.facilityId,
          variables.adminId,
        ],
      });

      toast.success(
        variables.rating ? "Rating submitted!" : "Audit note recorded.",
      );
    },
    onError: (error, variables, context: any) => {
      // Rollback on error
      if (context?.previousFacility) {
        queryClient.setQueryData(
          ["facility-profile", variables.facilityId],
          context.previousFacility,
        );
      }
      toast.error("Failed to submit: " + (error as Error).message);
    },
  });
};
