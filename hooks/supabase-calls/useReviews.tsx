import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FACILITY_PROFILE_QUERY_KEYS } from "./useFacilities";

export const useReviews = ({ facilityId }: { facilityId: string }) => {
  return useQuery({
    queryKey: ["facility-reviews", facilityId],
    queryFn: async () => {
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
