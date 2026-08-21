/**
 * Route-backed hooks for the Facilities management surface
 * (Gap Analysis Part H, H-Phase 3). Every mutation goes through the
 * RBAC-guarded /api/facilities routes instead of client-side Supabase
 * writes (closes H4). Reads keep useFacilityProfiles for the legacy page
 * data while the new tabs consume these hooks.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";
import {
  FACILITY_PROFILE_QUERY_KEYS,
  FEATURED_QUERY_KEYS,
  TOP_RATED_QUERY_KEYS,
} from "@/hooks/supabase-calls/useFacilities";

export const FACILITIES_API_KEYS = {
  all: ["facilities-api"] as const,
  lists: () => [...FACILITIES_API_KEYS.all, "list"] as const,
  list: (params: FacilitiesListParams) =>
    [...FACILITIES_API_KEYS.lists(), { ...params }] as const,
  stats: () => [...FACILITIES_API_KEYS.all, "stats"] as const,
};

export type FacilityStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "rejected";

export interface FacilityRow {
  id: string;
  facility_name: string;
  facility_type: string;
  region: string;
  district: string;
  area?: string | null;
  contact_number?: string | null;
  email?: string | null;
  status: FacilityStatus;
  is_top_rated: boolean;
  is_featured: boolean;
  featured_order?: number | null;
  hefra_registration_number?: string | null;
  top_rated_rank?: number | null;
  top_rated_set_at?: string | null;
  feature_type?: "paid" | "admin" | null;
  feature_start?: string | null;
  feature_end?: string | null;
  is_featured_paused?: boolean;
  status_reason?: string | null;
  status_changed_at?: string | null;
  rejection_reason?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  view_count?: number;
  rating_average?: number | null;
  rating_count?: number;
  subscription_tier?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface FacilitiesListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  featured?: "yes" | "no";
  top_rated?: "yes";
}

export interface FacilitiesListResponse {
  data: FacilityRow[];
  meta: { total: number; totalPages: number; currentPage: number };
}

export interface FacilityStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  suspended: number;
  rejected: number;
  topRated: number;
  featured: number;
  featuredPaused: number;
  averageRating: number | null;
  ratedFacilities: number;
}

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: FACILITIES_API_KEYS.all });
  queryClient.invalidateQueries({ queryKey: FACILITY_PROFILE_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: FEATURED_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: TOP_RATED_QUERY_KEYS.all });
};

// ========================= Queries =========================

export const useFacilitiesApiList = (params: FacilitiesListParams) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.type) qs.set("type", params.type);
  if (params.featured) qs.set("featured", params.featured);
  if (params.top_rated) qs.set("top_rated", params.top_rated);

  return useQuery<FacilitiesListResponse, Error>({
    queryKey: FACILITIES_API_KEYS.list(params),
    queryFn: () => apiFetch<FacilitiesListResponse>(`/api/facilities?${qs.toString()}`),
  });
};

export const useFacilityStatsApi = (enabled = true) => {
  return useQuery<FacilityStats, Error>({
    queryKey: FACILITIES_API_KEYS.stats(),
    queryFn: () => apiFetch<FacilityStats>("/api/facilities/stats"),
    enabled,
    staleTime: 60_000,
  });
};

// ========================= Mutations =========================

export const useUpdateFacilityStatusApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      ids?: string[];
      status: FacilityStatus;
      reason?: string;
    }) =>
      apiFetch<{ ok: boolean; updated: number }>(
        `/api/facilities/${input.id}/status`,
        {
          ...jsonBody({ ids: input.ids, status: input.status, reason: input.reason }),
          method: "PATCH",
        },
      ),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(
        variables.ids && variables.ids.length > 1
          ? `${variables.ids.length} facilities moved to ${variables.status}`
          : `Facility moved to ${variables.status}`,
      );
    },
    onError: (error: Error) => toast.error(`Status update failed: ${error.message}`),
  });
};

export const useSetTopRatedApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; rank?: number }) =>
      apiFetch<{ ok: boolean; rank: number }>(
        `/api/facilities/${input.id}/top-rated`,
        jsonBody({ rank: input.rank }),
      ),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("Top Rated leaderboard updated");
    },
    onError: (error: Error) => toast.error(`Top Rated update failed: ${error.message}`),
  });
};

export const useRemoveTopRatedApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) =>
      apiFetch<{ ok: boolean }>(`/api/facilities/${input.id}/top-rated`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("Facility removed from Top Rated");
    },
    onError: (error: Error) => toast.error(`Removal failed: ${error.message}`),
  });
};

export const useSetFeaturedApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      featured: boolean;
      feature_type?: "paid" | "admin";
      feature_end?: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/facilities/${input.id}/featured`, {
        ...jsonBody({
          featured: input.featured,
          feature_type: input.feature_type,
          feature_end: input.feature_end,
        }),
        method: "PUT",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(
        variables.featured
          ? "Facility featured"
          : "Facility removed from featured placements",
      );
    },
    onError: (error: Error) => toast.error(`Featured update failed: ${error.message}`),
  });
};

export const usePauseFeaturedApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paused: boolean }) =>
      apiFetch<{ ok: boolean }>(`/api/facilities/${input.id}/featured`, {
        ...jsonBody({ paused: input.paused }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(variables.paused ? "Placement paused" : "Placement resumed");
    },
    onError: (error: Error) => toast.error(`Pause update failed: ${error.message}`),
  });
};

// ========================= Export =========================

export async function downloadFacilitiesCsv() {
  const res = await fetch("/api/facilities/export", { cache: "no-store" });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const payload = await res.json();
      if (payload?.error) message = String(payload.error);
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `facilities-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
