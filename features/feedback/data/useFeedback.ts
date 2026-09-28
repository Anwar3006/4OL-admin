import { getBrowserClient } from "@/lib/db/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// AF-02 — Feedback Board (reviews, suggestions & recommendations).
// Admin surface. Reads go directly against feedback_posts (RLS grants admins
// full SELECT via is_app_admin()); every mutation goes through a SECURITY
// DEFINER RPC so status changes can fire watcher notifications server-side.
// retry:false everywhere so the pre-migration "table missing" state renders the
// graceful error card instead of retry-storming.

export type FeedbackCategory =
  | "review"
  | "suggestion"
  | "recommendation"
  | "bug"
  | "praise";
export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "closed";
export type FeedbackVisibility = "published" | "pending" | "hidden";

export interface FeedbackPostRow {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  title: string;
  body: string;
  rating: number | null;
  module: string | null;
  status: FeedbackStatus;
  status_note: string | null;
  vote_count: number;
  flag_count: number;
  is_anonymous: boolean;
  visibility: FeedbackVisibility;
  app_version: string | null;
  platform: string | null;
  source: string;
  created_at: string;
  reply_count?: number;
  [key: string]: any;
}

export interface FeedbackKpi {
  total_posts: number;
  posts_this_week: number;
  pending_moderation: number;
  flagged: number;
  shipped: number;
  open_ideas: number;
  avg_review_rating: number;
  top_voted: Array<{ id: string; title: string; vote_count: number }>;
}

export const useFeedbackKpi = () =>
  useQuery({
    queryKey: ["feedback-kpi"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_feedback_kpi_stats");
      if (error) throw error;
      return data as FeedbackKpi;
    },
    retry: false,
  });

export const useFeedbackPosts = ({
  visibility,
  status,
  category,
  search = "",
  limit = 200,
}: {
  visibility?: FeedbackVisibility;
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  search?: string;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["feedback-posts", visibility, status, category, search, limit],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      let query = supabase
        .from("feedback_posts")
        .select("*", { count: "exact" });

      if (visibility) query = query.eq("visibility", visibility);
      if (status) query = query.eq("status", status);
      if (category) query = query.eq("category", category);
      if (search) query = query.ilike("title", `%${search}%`);

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { posts: (data || []) as FeedbackPostRow[], count: count || 0 };
    },
    retry: false,
  });

export const useFeedbackPostDetail = (postId: string | null) =>
  useQuery({
    queryKey: ["feedback-post-detail", postId],
    enabled: !!postId,
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_feedback_post", {
        p_post_id: postId,
      });
      if (error) throw error;
      return data as { post: FeedbackPostRow; replies: any[] };
    },
    retry: false,
  });

const useInvalidateFeedback = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["feedback-posts"] });
    qc.invalidateQueries({ queryKey: ["feedback-kpi"] });
    qc.invalidateQueries({ queryKey: ["feedback-post-detail"] });
  };
};

export const useModerateFeedback = () => {
  const invalidate = useInvalidateFeedback();
  return useMutation({
    mutationFn: async ({
      postId,
      visibility,
      resetFlags = false,
    }: {
      postId: string;
      visibility: FeedbackVisibility;
      resetFlags?: boolean;
    }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc("admin_moderate_feedback_post", {
        p_post_id: postId,
        p_visibility: visibility,
        p_reset_flags: resetFlags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Feedback post updated.");
    },
    onError: (e) => toast.error("Moderation failed: " + (e as Error).message),
  });
};

export const useSetFeedbackStatus = () => {
  const invalidate = useInvalidateFeedback();
  return useMutation({
    mutationFn: async ({
      postId,
      status,
      statusNote,
    }: {
      postId: string;
      status: FeedbackStatus;
      statusNote?: string | null;
    }) => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("admin_set_feedback_status", {
        p_post_id: postId,
        p_status: status,
        p_status_note: statusNote ?? null,
      });
      if (error) throw error;
      return data as { notified_watchers: number };
    },
    onSuccess: (res) => {
      invalidate();
      toast.success(
        `Status updated · ${res?.notified_watchers ?? 0} watcher(s) notified.`,
      );
    },
    onError: (e) => toast.error("Status change failed: " + (e as Error).message),
  });
};

export const useStaffReply = () => {
  const invalidate = useInvalidateFeedback();
  return useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc("admin_reply_feedback_post", {
        p_post_id: postId,
        p_body: body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Staff reply posted.");
    },
    onError: (e) => toast.error("Reply failed: " + (e as Error).message),
  });
};

export const useConvertReview = () => {
  const invalidate = useInvalidateFeedback();
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc("admin_convert_review_to_post", {
        p_review_id: reviewId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Review converted to a board post (pending moderation).");
    },
    onError: (e) => toast.error("Convert failed: " + (e as Error).message),
  });
};
