/**
 * FacilityScout hooks — Gap Analysis Part N Phase 3.
 * Reads/writes go through the RBAC-guarded /api/facilityscout routes
 * (facilityscout.view / facilityscout.review). No client-side Supabase.
 */

import { apiFetch, jsonBody } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const FACILITYSCOUT_QUERY_KEYS = {
  all: ["facilityscout"] as const,
  overview: () => [...FACILITYSCOUT_QUERY_KEYS.all, "overview"] as const,
};

export type ScoutSubmission = {
  id: string;
  submission_ref: string;
  submitted_by: string;
  facility_name: string;
  facility_type: string;
  gps_location: string | null;
  photos: string[] | null;
  region: string | null;
  match_status: "new" | "duplicate";
  matched_facility_id: string | null;
  status: "pending" | "field_review" | "registered" | "rewarded" | "rejected";
  assigned_collector_id: string | null;
  priority: "normal" | "high" | "urgent";
  sla_due_at: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  user_profiles: { user_id: string; masked_name: string } | null;
  data_collectors: { employee_id: string } | null;
  matched_facility: { facility_name: string } | null;
};

export type ScoutConfig = {
  reward_hospital_mb: number;
  reward_pharmacy_mb: number;
  reward_clinic_mb: number;
  reward_lab_mb: number;
  reward_chps_mb: number;
  max_pending_per_user: number;
  gps_match_radius_m: number;
  photo_required: boolean;
  duplicate_detection: "gps_name" | "gps_only" | "manual";
  collector_auto_assign: boolean;
  reward_disbursement: "auto" | "manual";
  updated_at: string | null;
};

export type FacilityScoutOverview = {
  submissions: any[];
  collectors: any[];
  referrals: any[];
  scout_submissions: ScoutSubmission[];
  leaderboard: Array<{
    user_id: string;
    full_name: string;
    region: string | null;
    submissions: number;
    registered: number;
    duplicates: number;
    data_earned_mb: number;
  }>;
  config: ScoutConfig | null;
  metrics: {
    submissions: number;
    pendingReview: number;
    activeCollectors: number;
    rewardsDue: number;
    rewardLiability: number;
    totalSubmissions: number;
    scoutPending: number;
    facilitiesAdded: number;
    duplicates: number;
    rewardsQueue: number;
    dataRewardedMb: number;
  };
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
