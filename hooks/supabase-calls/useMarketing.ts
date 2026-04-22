import { supabase } from "@/lib/supabase";
import {
  TMarketingProfileInput,
  TMarketingProfileOutput,
} from "@/schemas/marketing-profile.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaginatedResponse {
  data: TMarketingProfileOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
  analytics: {
    draft: number;
    scheduled: number;
    live: number;
    paused: number;
    ended: number;
  };
}

type MarketingPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
};
export const MARKETING_PROFILE_QUERY_KEYS = {
  all: ["marketing-profiles"] as const,
  lists: () => [...MARKETING_PROFILE_QUERY_KEYS.all, "lists"] as const,
  list: (params: MarketingPaginationInput) =>
    [...MARKETING_PROFILE_QUERY_KEYS.lists(), params] as const,
  details: () => [...MARKETING_PROFILE_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) =>
    [...MARKETING_PROFILE_QUERY_KEYS.details(), id] as const,
};

export const useMarketingProfiles = ({
  page,
  limit,
  search,
  status,
}: MarketingPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: MARKETING_PROFILE_QUERY_KEYS.list({
      page,
      limit,
      search,
      status,
    }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("marketing_profile")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(
          `headline.ilike.%${search}%,description.ilike.%${search}%,organization.ilike.%${search}%`
        );
      }

      if (status) {
        query = query.eq("status", status);
      }

      const [campaignsResult, statsResult] = await Promise.all([
        query.order("createdAt", { ascending: false }).range(from, to),
        supabase.from("marketing_profile").select("status"),
      ]);

      if (campaignsResult.error) throw campaignsResult.error;
      if (statsResult.error) throw statsResult.error;

      //Process Stats (Client-side aggregation is faster than a 3rd query)
      const rawStats = statsResult.data;
      const statsMap = {
        draft: rawStats.filter((s) => s.status === "draft").length,
        scheduled: rawStats.filter((s) => s.status === "scheduled").length,
        live: rawStats.filter((s) => s.status === "live").length,
        paused: rawStats.filter((s) => s.status === "paused").length,
        ended: rawStats.filter((s) => s.status === "ended").length,
      };

      const totalCount = campaignsResult.count ?? 0;

      return {
        data: campaignsResult.data as TMarketingProfileOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
        analytics: statsMap,
      };
    },
  });
};

export const useMarketingProfile = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery<TMarketingProfileOutput, Error>({
    queryKey: MARKETING_PROFILE_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_profile")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as TMarketingProfileOutput;
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

export const useCreateMarketingProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<TMarketingProfileOutput, Error, TMarketingProfileInput>({
    mutationFn: async (data: TMarketingProfileInput) => {
      const linksArray: string[] = Object.values(data.links).filter(
        (link): link is string => typeof link === "string" && link.length > 0
      );

      const inputData = {
        ...data,
        links: linksArray,
      };

      const { data: result, error } = await supabase
        .from("marketing_profile")
        .insert(inputData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingProfileOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Marketing profile created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create marketing profile: ${error.message}`);
    },
  });
};

export const useUpdateMarketingProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TMarketingProfileOutput,
    Error,
    { id: string; data: Partial<TMarketingProfileOutput & { status: string }> }
  >({
    mutationFn: async ({ id, data: input }) => {
      let inputData = { ...input };

      if (input.links) {
        const linksArray: string[] = Object.values(input.links).filter(
          (link): link is string => typeof link === "string" && link.length > 0,
        );
        inputData = {
          ...inputData,
          links: linksArray,
        };
      }

      const { data: result, error } = await supabase
        .from("marketing_profile")
        .update(inputData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingProfileOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Marketing profile updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update marketing profile: ${error.message}`);
    },
  });
};

export const useDeleteMarketingProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; imageUrl: string }>({
    mutationFn: async ({ id, imageUrl }) => {
      // 1. Delete from Storage
      if (imageUrl) {
        const { error: storageError } = await supabase.storage
          .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!)
          .remove([imageUrl]);

        if (storageError) {
          console.warn("Storage deletion failed:", storageError);
        }
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from("marketing_profile")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Marketing profile and media deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete marketing profile: ${error.message}`);
    },
  });
};
