import { getSupabaseClient } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Part AC — App Reviews (periodic in-app rating pipeline).
// The mockup's Reviews menu includes an "App" review target
// (admin-panel.html L6674–6767); these hooks power the 📱 App Reviews tab
// on /reviews. Writes go through SECURITY DEFINER RPCs — the table itself is
// RLS-locked to admin reads.

export interface AppReviewRow {
  id: string;
  rating: number;
  comment_text: string | null;
  app_version: string | null;
  platform: string | null;
  prompt_source: string;
  status: "pending" | "approved" | "rejected" | string;
  admin_note: string | null;
  created_at: string;
  user_profiles: {
    user_id?: string;
    name: string;
  };
  [key: string]: any;
}

export interface AppReviewKpiStats {
  total_reviews: number;
  total_delta: number | null;
  average_rating: number;
  pending_reviews: number;
  low_rating_reviews: number;
}

export const useAppReviewsList = ({
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
    queryKey: ["app-reviews-list", pageIndex, pageSize, search, status],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("app_reviews")
        .select(
          `
          id,
          rating,
          comment_text,
          app_version,
          platform,
          prompt_source,
          status,
          admin_note,
          created_at,
          user_profiles (
            user_id,
            first_name,
            last_name
          )
        `,
          { count: "exact" },
        );

      if (status) {
        query = query.eq("status", status);
      }

      if (search) {
        query = query.ilike("comment_text", `%${search}%`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const reviews: AppReviewRow[] = (data || []).map((item: any) => ({
        ...item,
        user_profiles: {
          user_id: item.user_profiles?.user_id,
          name:
            `${item.user_profiles?.first_name || ""} ${item.user_profiles?.last_name || ""}`.trim() ||
            "Anonymous",
        },
      }));

      return { reviews, count: count || 0 };
    },
    placeholderData: (previousData) => previousData,
    // Pre-migration the table doesn't exist yet — surface the error state in
    // the tab's error card rather than retry-storming the missing relation.
    retry: false,
  });
};

export const useAppReviewKpiStats = () => {
  return useQuery({
    queryKey: ["app-review-kpi-stats"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_app_review_kpi_stats");

      if (error) throw error;

      return data as AppReviewKpiStats;
    },
    retry: false,
  });
};

export const useModerateAppReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
      note,
    }: {
      reviewId: string;
      status: "approved" | "rejected";
      note?: string | null;
    }) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.rpc("admin_moderate_app_review", {
        p_review_id: reviewId,
        p_status: status,
        p_note: note || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["app-reviews-list"] });
      queryClient.invalidateQueries({ queryKey: ["app-review-kpi-stats"] });
      toast.success(
        variables.status === "approved"
          ? "App review approved."
          : "App review rejected.",
      );
    },
    onError: (error) => {
      toast.error("Failed to moderate review: " + (error as Error).message);
    },
  });
};
