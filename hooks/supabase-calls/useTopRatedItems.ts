import { getSupabaseClient } from "@/lib/supabase";
import {
  TTopRatedItemInput,
  TTopRatedItemOutput,
} from "@/schemas/top-rated.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaginatedResponse {
  data: TTopRatedItemOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

type TopRatedItemRow = {
  id: string;
  module: string;
  item_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rating: number | null;
  rating_count: number | null;
  source: string;
  rank: number | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
  publish_from: string | null;
  expire_at: string | null;
};

type TopRatedPaginationInput = {
  page: number;
  limit: number;
  module?: string;
  search?: string;
  windowStatus?: "all" | "active" | "scheduled" | "expired";
};

export const TOP_RATED_QUERY_KEYS = {
  all: ["top-rated-items"] as const,
  lists: () => [...TOP_RATED_QUERY_KEYS.all, "lists"] as const,
  list: (params: TopRatedPaginationInput) =>
    [...TOP_RATED_QUERY_KEYS.lists(), params] as const,
  details: () => [...TOP_RATED_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) => [...TOP_RATED_QUERY_KEYS.details(), id] as const,
  counts: () => ["top-rated-module-counts"] as const,
};

const mapTopRatedRow = (row: TopRatedItemRow): TTopRatedItemOutput => ({
  id: row.id,
  module: row.module as any,
  item_id: row.item_id,
  title: row.title,
  subtitle: row.subtitle,
  image_url: row.image_url,
  rating: row.rating,
  rating_count: row.rating_count,
  source: row.source as any,
  rank: row.rank,
  added_by: row.added_by,
  added_at: row.added_at,
  updated_at: row.updated_at,
  publish_from: row.publish_from,
  expire_at: row.expire_at,
});

/**
 * Placement-window state for a curated item (Gap Analysis T-D2). Mirrors the
 * lazy expiry filter the mobile shelf applies at read time.
 */
export const getTopRatedWindowStatus = (
  item: Pick<TTopRatedItemOutput, "publish_from" | "expire_at">,
  now: Date = new Date(),
): "active" | "scheduled" | "expired" => {
  if (item.expire_at && new Date(item.expire_at).getTime() < now.getTime()) {
    return "expired";
  }
  if (item.publish_from && new Date(item.publish_from).getTime() > now.getTime()) {
    return "scheduled";
  }
  return "active";
};

export const useTopRatedItems = ({
  page,
  limit,
  module,
  search,
  windowStatus,
}: TopRatedPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: TOP_RATED_QUERY_KEYS.list({
      page,
      limit,
      module,
      search,
      windowStatus,
    }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const nowIso = new Date().toISOString();

      const supabase = await getSupabaseClient();
      let query = supabase
        .from("top_rated_items")
        .select("*", { count: "exact" });

      if (module) {
        query = query.eq("module", module);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%`);
      }

      if (windowStatus === "expired") {
        query = query.not("expire_at", "is", null).lt("expire_at", nowIso);
      } else if (windowStatus === "scheduled") {
        query = query
          .not("publish_from", "is", null)
          .gt("publish_from", nowIso);
      } else if (windowStatus === "active") {
        query = query
          .or(`expire_at.is.null,expire_at.gte.${nowIso}`)
          .or(`publish_from.is.null,publish_from.lte.${nowIso}`);
      }

      const result = await query
        .order("rank", { ascending: true })
        .order("rating", { ascending: false })
        .order("added_at", { ascending: false })
        .range(from, to);

      if (result.error) throw result.error;

      const totalCount = result.count ?? 0;

      return {
        data: ((result.data || []) as TopRatedItemRow[]).map(mapTopRatedRow),
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
  });
};

/**
 * Checks whether a specific entity (module + item_id) is currently
 * curated as a top-rated item. Used to drive the toggle switch shown
 * in each entity's view dialog.
 */
export const useIsTopRated = (module: string, itemId?: string | null) => {
  return useQuery<TTopRatedItemOutput | null, Error>({
    queryKey: [...TOP_RATED_QUERY_KEYS.all, "is-top-rated", module, itemId],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("top_rated_items")
        .select("*")
        .eq("module", module)
        .eq("item_id", itemId as string)
        .maybeSingle();

      if (error) throw error;
      return data ? mapTopRatedRow(data as TopRatedItemRow) : null;
    },
    enabled: !!module && !!itemId,
  });
};

// =============== Mutation Hooks ============

export const useUpsertTopRatedItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TTopRatedItemOutput,
    Error,
    TTopRatedItemInput & { admin_id: string }
  >({
    mutationFn: async (data) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase.rpc(
        "admin_upsert_top_rated_item",
        {
          p_module: data.module,
          p_item_id: data.item_id,
          p_title: data.title,
          p_subtitle: data.subtitle,
          p_image_url: data.image_url,
          p_rating: data.rating,
          p_rating_count: data.rating_count,
          p_source: data.source || "manual",
          p_rank: data.rank,
          p_added_by: data.added_by || data.admin_id,
          p_publish_from: data.publish_from || null,
          p_expire_at: data.expire_at || null,
        },
      );

      if (error) throw new Error(error.message);
      return result as TTopRatedItemOutput;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TOP_RATED_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ["top-rated-module-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["search-top-rated-items"] }),
      ]);
      toast.success("Top-rated item updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update top-rated item: ${error.message}`);
    },
  });
};

export const useRemoveTopRatedItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { module: string; item_id: string }>({
    mutationFn: async ({ module, item_id }) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.rpc("admin_remove_top_rated_item", {
        p_module: module,
        p_item_id: item_id,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TOP_RATED_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ["top-rated-module-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["search-top-rated-items"] }),
      ]);
      toast.success("Top-rated item removed successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to remove top-rated item: ${error.message}`);
    },
  });
};

/**
 * Fetches every curated item in one query for CSV export (Gap Analysis T-D4).
 * The curation list is small by design, so a full select is cheaper than
 * paginating.
 */
export const fetchTopRatedItemsForExport = async (
  module?: string,
): Promise<TTopRatedItemOutput[]> => {
  const supabase = await getSupabaseClient();
  let query = supabase
    .from("top_rated_items")
    .select("*")
    .order("rank", { ascending: true })
    .order("rating", { ascending: false })
    .limit(1000);

  if (module) {
    query = query.eq("module", module);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as TopRatedItemRow[]).map(mapTopRatedRow);
};
