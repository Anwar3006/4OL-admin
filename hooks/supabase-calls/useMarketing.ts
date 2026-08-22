/**
 * Marketing campaign hooks — Gap Analysis Part M Phase 3 retrofit.
 * All data access now goes through RBAC-guarded /api/marketing/campaigns
 * routes (marketing.view/create/edit/delete) instead of client-side
 * Supabase, which bypassed permission checks entirely.
 */

import { apiFetch } from "@/lib/api-fetch";
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
    pending_review: number;
    rejected: number;
  };
}

type MarketingPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
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

const toLinksArray = (links: unknown): string[] | undefined => {
  if (!links) return undefined;
  if (Array.isArray(links)) return links.filter((l): l is string => typeof l === "string" && l.length > 0);
  if (typeof links === "object") {
    return Object.values(links as Record<string, unknown>).filter(
      (link): link is string => typeof link === "string" && link.length > 0,
    );
  }
  return undefined;
};

export const useMarketingProfiles = ({
  page,
  limit,
  search,
  status,
  channel,
  dateFrom,
  dateTo,
}: MarketingPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: MARKETING_PROFILE_QUERY_KEYS.list({
      page,
      limit,
      search,
      status,
      channel,
      dateFrom,
      dateTo,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (channel) params.set("channel", channel);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      return apiFetch<PaginatedResponse>(`/api/marketing/campaigns?${params.toString()}`);
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
      const result = await apiFetch<{ data: TMarketingProfileOutput }>(
        `/api/marketing/campaigns/${id}`,
      );
      return result.data;
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

export const useCreateMarketingProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<TMarketingProfileOutput, Error, TMarketingProfileInput & Record<string, unknown>>({
    mutationFn: async (data) => {
      const inputData = {
        ...data,
        links: toLinksArray(data.links) ?? [],
      };
      const result = await apiFetch<{ data: TMarketingProfileOutput }>(
        "/api/marketing/campaigns",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputData),
        },
      );
      return result.data;
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
    { id: string; data: Partial<Omit<TMarketingProfileOutput, "status"> & { status: string }> }
  >({
    mutationFn: async ({ id, data: input }) => {
      let inputData: Record<string, unknown> = { ...input };
      if ("links" in inputData) {
        inputData.links = toLinksArray(inputData.links) ?? [];
      }

      const result = await apiFetch<{ data: TMarketingProfileOutput }>(
        `/api/marketing/campaigns/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputData),
        },
      );
      return result.data;
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

  return useMutation<void, Error, { id: string; imageUrl?: string }>({
    mutationFn: async ({ id }) => {
      // Storage cleanup now happens server-side alongside the row delete.
      await apiFetch<{ ok: boolean }>(`/api/marketing/campaigns/${id}`, {
        method: "DELETE",
      });
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

// =============== Review + Bulk (M3/M4) ============

export const useReviewMarketingProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; status: string },
    Error,
    {
      id: string;
      decision: "approve" | "reject";
      review_notes?: string;
      approved_start_date?: string;
      approved_end_date?: string;
    }
  >({
    mutationFn: async ({ id, ...payload }) => {
      const result = await apiFetch<{ data: { id: string; status: string } }>(
        `/api/marketing/campaigns/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      return result.data;
    },
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_PROFILE_QUERY_KEYS.all,
      });
      toast.success(
        decision === "approve" ? "Campaign approved & launched!" : "Campaign rejected.",
      );
    },
    onError: (error) => {
      toast.error(`Review failed: ${error.message}`);
    },
  });
};

export const useBatchMarketingProfiles = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { ids: string[]; action: "launch" | "pause" | "end" }>({
    mutationFn: async (payload) => {
      await apiFetch<{ ok: boolean }>("/api/marketing/campaigns/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, { action, ids }) => {
      queryClient.invalidateQueries({
        queryKey: MARKETING_PROFILE_QUERY_KEYS.all,
      });
      toast.success(`${ids.length} campaign(s) ${action}ed successfully!`);
    },
    onError: (error) => {
      toast.error(`Bulk action failed: ${error.message}`);
    },
  });
};
