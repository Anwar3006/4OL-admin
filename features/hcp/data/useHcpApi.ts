/**
 * Route-backed hooks for the Healthcare Professionals surface
 * (Gap Analysis Part J, J-Phase 3). All reads/writes go through the
 * RBAC-guarded /api/hcp routes.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";

export const HCP_API_KEYS = {
  all: ["hcp-api"] as const,
  lists: () => [...HCP_API_KEYS.all, "list"] as const,
  list: (params: HcpListParams) =>
    [...HCP_API_KEYS.lists(), { ...params }] as const,
};

export const PROFESSION_TYPES = [
  "doctor",
  "nurse",
  "midwife",
  "pharmacist",
  "pharmacy_technician",
  "physician_assistant",
  "medical_lab_scientist",
  "radiographer",
  "physiotherapist",
  "dietitian",
  "optometrist",
  "community_health_officer",
  "paramedic",
  "dental_surgeon",
] as const;

export const REGULATORY_BODIES = ["MDC", "PCG", "NMC", "AHPC", "GPC"] as const;

export const PROFESSION_GROUPS: Record<string, string[]> = {
  doctors: ["doctor"],
  nurses: ["nurse", "midwife"],
  pharmacists: ["pharmacist", "pharmacy_technician"],
  allied: [
    "physician_assistant",
    "medical_lab_scientist",
    "radiographer",
    "physiotherapist",
    "dietitian",
    "optometrist",
    "community_health_officer",
    "paramedic",
    "dental_surgeon",
  ],
};

export type HcpVerificationStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";

export interface HcpRow {
  id: string;
  user_id: string;
  license_number: string;
  license_type: string;
  issuing_body: string;
  license_expiry?: string | null;
  specialty?: string | null;
  years_of_practice?: number | null;
  profession_type?: string | null;
  affiliated_facility_id?: string | null;
  affiliated_facility_name?: string | null;
  region?: string | null;
  group_chat_id?: string | null;
  can_respond_enquiries?: boolean;
  year_licensed?: number | null;
  documents?: unknown[];
  verification_status: HcpVerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  next_verification_due?: string | null;
  created_at?: string;
  user_profiles?: {
    first_name?: string | null;
    last_name?: string | null;
    phone_number?: string | null;
    status?: string | null;
    role?: string | null;
    last_active?: string | null;
  } | null;
  facility_profile?: { facility_name?: string | null } | null;
}

export interface HcpGroupChat {
  id: string;
  name?: string | null;
  group_name?: string | null;
  group_category?: string | null;
  is_verified_only?: boolean;
  last_message_at?: string | null;
  max_members?: number | null;
  member_count: number;
}

export interface HcpListParams {
  page?: number;
  limit?: number;
  search?: string;
  profession?: string;
  issuing_body?: string;
  status?: string;
  region?: string;
}

export interface HcpListResponse {
  verifications: HcpRow[];
  groupChats: HcpGroupChat[];
  meta: { total: number; totalPages: number; currentPage: number };
  metrics: {
    totalHcp: number;
    pending: number;
    verified: number;
    expiring: number;
    groupChats: number;
  };
}

export interface HcpOnboardInput {
  user_email: string;
  license_number: string;
  license_type: string;
  issuing_body: string;
  license_expiry: string;
  specialty?: string;
  profession_type?: string;
  years_of_practice?: number;
  year_licensed?: number;
  affiliated_facility_id?: string;
  affiliated_facility_name?: string;
  region?: string;
  group_chat_id?: string;
  can_respond_enquiries?: boolean;
}

/** Derived display ID matching the 4OL-XXXXXX convention (no new column). */
export const hcpDisplayId = (userId: string) =>
  `4OL-${userId.slice(0, 6).toUpperCase()}`;

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: HCP_API_KEYS.all });
};

// ========================= Queries =========================

export const useHcpList = (params: HcpListParams) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.profession) qs.set("profession", params.profession);
  if (params.issuing_body) qs.set("issuing_body", params.issuing_body);
  if (params.status) qs.set("status", params.status);
  if (params.region) qs.set("region", params.region);

  return useQuery<HcpListResponse, Error>({
    queryKey: HCP_API_KEYS.list(params),
    queryFn: () => apiFetch<HcpListResponse>(`/api/hcp?${qs.toString()}`),
  });
};

// ========================= Mutations =========================

export const useOnboardHcp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: HcpOnboardInput) =>
      apiFetch<{ ok: boolean; id: string }>("/api/hcp", jsonBody(input)),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("HCP onboarding submitted — pending verification");
    },
    onError: (error: Error) => toast.error(`Onboarding failed: ${error.message}`),
  });
};

export const useVerifyHcp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/hcp/${input.id}/verify`, {
        ...jsonBody({ decision: input.decision, reason: input.reason }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      toast.success(
        variables.decision === "approved"
          ? "HCP verification approved"
          : "HCP verification rejected",
      );
    },
    onError: (error: Error) => toast.error(`Verify failed: ${error.message}`),
  });
};

export const useEditHcp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action?: "suspend" | "reactivate";
      reason?: string;
      [key: string]: unknown;
    }) =>
      apiFetch<{ ok: boolean }>(`/api/hcp/${input.id}`, {
        ...jsonBody(input),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      invalidateAll(queryClient);
      if (variables.action) {
        toast.success(
          variables.action === "suspend" ? "HCP suspended" : "HCP reactivated",
        );
      } else {
        toast.success("HCP record updated");
      }
    },
    onError: (error: Error) => toast.error(`Update failed: ${error.message}`),
  });
};

export const useHcpBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; action: "approve" | "suspend" }) =>
      apiFetch<{ ok: boolean; updated: number }>("/api/hcp/bulk", jsonBody(input)),
    onSuccess: (data, variables) => {
      invalidateAll(queryClient);
      toast.success(
        `${data.updated} HCP record(s) ${variables.action === "approve" ? "approved" : "suspended"}`,
      );
    },
    onError: (error: Error) => toast.error(`Bulk action failed: ${error.message}`),
  });
};

// ========================= Export =========================

export async function downloadHcpCsv() {
  const res = await fetch("/api/hcp/export", { cache: "no-store" });
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
  anchor.download = `hcp-registry-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
