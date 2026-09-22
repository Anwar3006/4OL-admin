import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";
import type {
  ProviderDetail,
  ProviderOptionsResponse,
  ProviderStatsResponse,
  ProvidersListParams,
  ProvidersListResponse,
  ProviderStatus,
} from "../schema/types";

export const PROVIDERS_QUERY_KEYS = {
  all: ["providers"] as const,
  lists: () => [...PROVIDERS_QUERY_KEYS.all, "list"] as const,
  list: (params: ProvidersListParams) => [...PROVIDERS_QUERY_KEYS.lists(), { ...params }] as const,
  stats: () => [...PROVIDERS_QUERY_KEYS.all, "stats"] as const,
  options: () => [...PROVIDERS_QUERY_KEYS.all, "options"] as const,
  detail: (id: string) => [...PROVIDERS_QUERY_KEYS.all, "detail", id] as const,
};

export function useProvidersList(params: ProvidersListParams) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.kind && params.kind !== "all") qs.set("kind", params.kind);
  if (params.type && params.type !== "all") qs.set("type", params.type);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.verification && params.verification !== "all") qs.set("verification", params.verification);
  if (params.tier && params.tier !== "all") qs.set("tier", params.tier);
  if (params.region && params.region !== "all") qs.set("region", params.region);

  return useQuery<ProvidersListResponse, Error>({
    queryKey: PROVIDERS_QUERY_KEYS.list(params),
    queryFn: () => apiFetch<ProvidersListResponse>(`/api/providers?${qs.toString()}`),
  });
}

export function useProviderStats(enabled = true) {
  return useQuery<ProviderStatsResponse, Error>({
    queryKey: PROVIDERS_QUERY_KEYS.stats(),
    queryFn: () => apiFetch<ProviderStatsResponse>("/api/providers/stats"),
    enabled,
    staleTime: 60_000,
  });
}

export function useProviderOptions() {
  return useQuery<ProviderOptionsResponse, Error>({
    queryKey: PROVIDERS_QUERY_KEYS.options(),
    queryFn: () => apiFetch<ProviderOptionsResponse>("/api/providers/options"),
    staleTime: 5 * 60_000,
  });
}

export function useProviderDetail(id: string | null) {
  return useQuery<ProviderDetail, Error>({
    queryKey: PROVIDERS_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => apiFetch<ProviderDetail>(`/api/providers/${id}`),
    enabled: !!id,
  });
}

export function useUpdateProviderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; ids?: string[]; status: ProviderStatus; reason?: string }) =>
      apiFetch<{ ok: boolean; updated: number }>(`/api/providers/${input.id}/status`, {
        ...jsonBody({ ids: input.ids, status: input.status, reason: input.reason }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEYS.all });
      toast.success(
        variables.ids && variables.ids.length > 1
          ? `${variables.ids.length} providers moved to ${variables.status}`
          : `Provider moved to ${variables.status}`,
      );
    },
    onError: (error: Error) => toast.error(`Status update failed: ${error.message}`),
  });
}
