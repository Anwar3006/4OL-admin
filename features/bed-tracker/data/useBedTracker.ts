/**
 * BedTracker (PKM) hooks — Gap Analysis Part L Phase 3.
 * All reads/writes go through the RBAC-guarded /api/bedtracker routes
 * (bedtracker.view / bedtracker.manage). No client-side Supabase.
 */

import { apiFetch, jsonBody } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  BedTrackerOverview,
  BedTrackerWard,
} from "@/features/bed-tracker/schema/types";

// Re-exported for existing importers. New code should take these from
// the schema module directly.
export type {
  BedTrackerOverview,
  BedTrackerWard,
};


export const BEDTRACKER_QUERY_KEYS = {
  all: ["bedtracker"] as const,
  overview: () => [...BEDTRACKER_QUERY_KEYS.all, "overview"] as const,
  routeSuggestions: (params: Record<string, unknown>) =>
    [...BEDTRACKER_QUERY_KEYS.all, "route-suggestions", params] as const,
};

export const useBedTrackerOverview = () =>
  useQuery<BedTrackerOverview, Error>({
    queryKey: BEDTRACKER_QUERY_KEYS.overview(),
    queryFn: () => apiFetch<BedTrackerOverview>("/api/bedtracker"),
  });

export const useUpdateBedTrackerWard = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; alertRaised: boolean },
    Error,
    { id: string; total_beds: number; occupied_beds: number; update_source?: string }
  >({
    mutationFn: async ({ id, ...payload }) =>
      apiFetch(`/api/bedtracker/wards/${id}`, {
        ...jsonBody(payload),
        method: "PATCH",
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: BEDTRACKER_QUERY_KEYS.all });
      toast.success(
        result.alertRaised
          ? "Beds updated — capacity alert raised"
          : "Bed counts updated",
      );
    },
    onError: (error) => toast.error(`Bed update failed: ${error.message}`),
  });
};

export const useRegisterBedTrackerFacility = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, Record<string, unknown>>({
    mutationFn: async (payload) =>
      apiFetch("/api/bedtracker/facilities", jsonBody(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BEDTRACKER_QUERY_KEYS.all });
      toast.success("Facility registered for BedTracker");
    },
    onError: (error) => toast.error(`Registration failed: ${error.message}`),
  });
};

export const useUpdateBedTrackerFacility = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: async ({ id, data }) =>
      apiFetch(`/api/bedtracker/facilities/${id}`, {
        ...jsonBody(data),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BEDTRACKER_QUERY_KEYS.all });
      toast.success("Facility updated");
    },
    onError: (error) => toast.error(`Update failed: ${error.message}`),
  });
};

export const useRouteSuggestions = (params: {
  gps?: string;
  wardType?: string;
}) =>
  useQuery<{ suggestions: any[] }, Error>({
    queryKey: BEDTRACKER_QUERY_KEYS.routeSuggestions(params),
    queryFn: () =>
      apiFetch(
        `/api/bedtracker/route-suggestions?gps=${encodeURIComponent(params.gps ?? "")}&ward_type=${encodeURIComponent(params.wardType ?? "")}&limit=3`,
      ),
    enabled: Boolean(params.gps && params.wardType),
  });

export const useCreateAmbulanceDispatch = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, Record<string, unknown>>({
    mutationFn: async (payload) =>
      apiFetch("/api/bedtracker/dispatches", jsonBody(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BEDTRACKER_QUERY_KEYS.all });
      toast.success("Ambulance dispatched");
    },
    onError: (error) => toast.error(`Dispatch failed: ${error.message}`),
  });
};

export const useResolveBedTrackerAlert = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: async (id) =>
      apiFetch(`/api/bedtracker/alerts/${id}`, {
        ...jsonBody({}),
        method: "PATCH",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BEDTRACKER_QUERY_KEYS.all });
      toast.success("Alert resolved");
    },
    onError: (error) => toast.error(`Resolve failed: ${error.message}`),
  });
};
