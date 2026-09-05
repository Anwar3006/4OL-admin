/**
 * FacilityScout hooks — Gap Analysis Part N Phase 3.
 * Reads/writes go through the RBAC-guarded /api/facilityscout routes
 * (facilityscout.view / facilityscout.review). No client-side Supabase.
 */

import { apiFetch, jsonBody } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  FacilityScoutOverview,
  ScoutConfig,
  ScoutSubmission,
} from "@/features/facility-scout/schema/types";

// Re-exported for existing importers. New code should take these from
// the schema module directly.
export type {
  FacilityScoutOverview,
  ScoutConfig,
  ScoutSubmission,
};


export const FACILITYSCOUT_QUERY_KEYS = {
  all: ["facilityscout"] as const,
  overview: () => [...FACILITYSCOUT_QUERY_KEYS.all, "overview"] as const,
};

export const useFacilityScoutOverview = () =>
  useQuery<FacilityScoutOverview, Error>({
    queryKey: FACILITYSCOUT_QUERY_KEYS.overview(),
    queryFn: () => apiFetch<FacilityScoutOverview>("/api/facilityscout"),
  });

const invalidateScout = async (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: FACILITYSCOUT_QUERY_KEYS.all });

export const useAssignScoutSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; updated: number },
    Error,
    {
      id?: string;
      ids?: string[];
      collector_id: string | null;
      priority?: "normal" | "high" | "urgent";
      admin_notes?: string;
    }
  >({
    mutationFn: async ({ id, ...payload }) =>
      apiFetch(`/api/facilityscout/submissions/${id ?? "bulk"}/assign`, jsonBody(payload)),
    onSuccess: async (result) => {
      await invalidateScout(queryClient);
      toast.success(`${result.updated} submission(s) updated`);
    },
    onError: (error) => toast.error(`Assign failed: ${error.message}`),
  });
};

export const useRejectScoutSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; updated: number },
    Error,
    {
      id?: string;
      ids?: string[];
      review_notes?: string;
      duplicate?: boolean;
      matched_facility_id?: string;
    }
  >({
    mutationFn: async ({ id, ...payload }) =>
      apiFetch(`/api/facilityscout/submissions/${id ?? "bulk"}/reject`, jsonBody(payload)),
    onSuccess: async (result) => {
      await invalidateScout(queryClient);
      toast.success(`${result.updated} submission(s) rejected`);
    },
    onError: (error) => toast.error(`Reject failed: ${error.message}`),
  });
};

export const useRegisterScoutSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean },
    Error,
    { id: string; matched_facility_id?: string; review_notes?: string }
  >({
    mutationFn: async ({ id, ...payload }) =>
      apiFetch(`/api/facilityscout/submissions/${id}/register`, jsonBody(payload)),
    onSuccess: async () => {
      await invalidateScout(queryClient);
      toast.success("Facility registered");
    },
    onError: (error) => toast.error(`Register failed: ${error.message}`),
  });
};

export const useDisburseScoutReward = () => {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id?: string; ids?: string[] }>({
    mutationFn: async ({ id, ...payload }) =>
      apiFetch(`/api/facilityscout/rewards/${id ?? "bulk"}/disburse`, jsonBody(payload)),
    onSuccess: async () => {
      await invalidateScout(queryClient);
      toast.success("Reward marked as sent");
    },
    onError: (error) => toast.error(`Disbursement failed: ${error.message}`),
  });
};

export const useUpdateScoutConfig = () => {
  const queryClient = useQueryClient();
  return useMutation<{ config: ScoutConfig }, Error, Partial<ScoutConfig>>({
    mutationFn: async (payload) =>
      apiFetch("/api/facilityscout/config", { ...jsonBody(payload), method: "PATCH" }),
    onSuccess: async () => {
      await invalidateScout(queryClient);
      toast.success("FacilityScout settings saved");
    },
    onError: (error) => toast.error(`Settings save failed: ${error.message}`),
  });
};
