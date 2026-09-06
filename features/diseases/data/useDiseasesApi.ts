/**
 * Route-backed Diseases & Conditions hooks (Gap Analysis Part I, I-Phase 3).
 * Mirrors Part M's pattern: hooks call our own /api/diseases server routes
 * so RBAC is enforced server-side instead of trusting the client Supabase
 * session. Query-key invalidation reuses CONDITIONS_QUERY_KEYS from the
 * legacy useCondition.ts so dialogs that still mutate via RPCs stay in sync.
 */

import { apiFetch, jsonBody } from "@/lib/api-fetch";
import { CONDITIONS_QUERY_KEYS } from "@/features/diseases/data/useCondition";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const DISEASES_API_KEYS = {
  all: ["diseases-api"] as const,
  lists: () => [...DISEASES_API_KEYS.all, "lists"] as const,
  list: (params: DiseasesListParams) =>
    [...DISEASES_API_KEYS.lists(), { ...params }] as const,
  stats: () => [...DISEASES_API_KEYS.all, "stats"] as const,
  engagement: () => [...DISEASES_API_KEYS.all, "engagement"] as const,
  linkages: () => [...DISEASES_API_KEYS.all, "linkages"] as const,
};

export interface DiseasesListParams {
  limit: number;
  page: number;
  search: string;
  status?: string;
  featured?: string;
}

export interface DiseaseListResponse {
  conditions: any[];
  meta: { total: number; totalPages: number; currentPage: number };
}

export interface DiseaseStats {
  totals: {
    conditions: number;
    views: number;
    likes: number;
    saves: number;
    reviewRate: number;
    saveRate: number;
    likeRate: number;
  };
  topViewed: { id: string; name: string; value: number }[];
  topLiked: { id: string; name: string; value: number }[];
  topSaved: { id: string; name: string; value: number }[];
  categoryBreakdown: { name: string; count: number }[];
  engagementPipelineLive: boolean;
}

export interface DiseaseEngagement {
  totals: {
    views: number;
    likes: number;
    saves: number;
    uniqueEngagers: number;
    saveRate: number;
    likeRate: number;
  };
  trend: { date: string; likes: number; saves: number }[];
  topLiked: { id: string; name: string; contentType: string; value: number }[];
  topSaved: { id: string; name: string; contentType: string; value: number }[];
  byType: { type: string; likes: number; saves: number }[];
}

export interface DiseaseLinkage {
  key: string;
  label: string;
  count: number | null;
  note: string;
  href: string;
  status: "active" | "in-development";
}

export const useDiseasesList = ({
  params,
  enabled,
}: {
  params: DiseasesListParams;
  enabled: boolean;
}) => {
  return useQuery<DiseaseListResponse, Error>({
    queryKey: DISEASES_API_KEYS.list(params),
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
      });
      if (params.status) qs.set("status", params.status);
      if (params.featured) qs.set("featured", params.featured);
      return apiFetch<DiseaseListResponse>(`/api/diseases?${qs.toString()}`);
    },
    enabled,
  });
};

export const useDiseasesStatsApi = (enabled: boolean) => {
  return useQuery<DiseaseStats, Error>({
    queryKey: DISEASES_API_KEYS.stats(),
    queryFn: () => apiFetch<DiseaseStats>("/api/diseases/stats"),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
};

/** Pipeline-wide likes/saves analytics (Mapping Audit Part 4, engagement.view). */
export const useDiseasesEngagementApi = (enabled: boolean) => {
  return useQuery<DiseaseEngagement, Error>({
    queryKey: DISEASES_API_KEYS.engagement(),
    queryFn: () => apiFetch<DiseaseEngagement>("/api/diseases/engagement"),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
};

export const useDiseaseLinkages = (enabled: boolean) => {
  return useQuery<{ linkages: DiseaseLinkage[]; registry: Record<string, number | null> }, Error>({
    queryKey: DISEASES_API_KEYS.linkages(),
    queryFn: () => apiFetch("/api/diseases/linkages"),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
};

//======================= Mutation Hooks ===============

/** POST /api/diseases — create via the RBAC-guarded server route. */
export const useCreateConditionApi = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean; id: string }, Error, Record<string, unknown>>({
    mutationFn: (input) => apiFetch("/api/diseases", jsonBody(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISEASES_API_KEYS.all });
      toast.success("Condition created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create condition: ${error.message}`);
    },
  });
};

/** PATCH /api/diseases/[id] — update via the RBAC-guarded server route. */
export const useUpdateConditionApi = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; id: string },
    Error,
    Record<string, unknown> & { id: string }
  >({
    mutationFn: ({ id, ...input }) =>
      apiFetch(`/api/diseases/${id}`, { ...jsonBody(input), method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISEASES_API_KEYS.all });
      toast.success("Condition updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update condition: ${error.message}`);
    },
  });
};

export type ConditionStatus = "draft" | "pending_review" | "published" | "archived";

/** PATCH /api/diseases/[id]/status — single or bulk (ids supersedes path id). */
export const useUpdateConditionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; updated: number },
    Error,
    { id: string; ids?: string[]; status: ConditionStatus }
  >({
    mutationFn: ({ id, ids, status }) =>
      apiFetch(`/api/diseases/${id}/status`, {
        ...jsonBody({ ids, status }),
        method: "PATCH",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISEASES_API_KEYS.all });
      toast.success(
        `${vars.ids?.length ?? 1} condition(s) moved to ${vars.status.replace("_", " ")}.`,
      );
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

/** PUT /api/diseases/[id]/feature — carousel slot assign/remove, bulk-capable. */
export const useFeatureCondition = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; updated: number },
    Error,
    { id: string; ids?: string[]; featured: boolean; position?: number }
  >({
    mutationFn: ({ id, ids, featured, position }) =>
      apiFetch(`/api/diseases/${id}/feature`, {
        ...jsonBody({ ids, featured, position }),
        method: "PUT",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISEASES_API_KEYS.all });
      toast.success(
        vars.featured
          ? `${vars.ids?.length ?? 1} condition(s) added to the carousel.`
          : `${vars.ids?.length ?? 1} condition(s) removed from the carousel.`,
      );
    },
    onError: (error) => {
      toast.error(`Carousel update failed: ${error.message}`);
    },
  });
};

/** DELETE /api/diseases/[id] — junction cascade + optional storage cleanup. */
export const useDeleteConditionApi = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean },
    Error,
    { id: string; imagePaths?: string[] }
  >({
    mutationFn: ({ id, imagePaths }) =>
      apiFetch(`/api/diseases/${id}`, {
        ...jsonBody({ imagePaths }),
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISEASES_API_KEYS.all });
      toast.success("Condition deleted.");
    },
    onError: (error) => {
      toast.error(`Failed to delete condition: ${error.message}`);
    },
  });
};

/**
 * CSV export download — /api/diseases/export returns text/csv, so this
 * fetches the blob directly instead of going through apiFetch (JSON).
 */
export async function downloadConditionsCsv(): Promise<void> {
  const res = await fetch("/api/diseases/export", { cache: "no-store" });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const payload = await res.json();
      if (payload?.error) message = String(payload.error);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `conditions-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
