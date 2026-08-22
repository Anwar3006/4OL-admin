/**
 * Medication Enquiry hooks — Gap Analysis Part AB.
 * All Medication Enquiry surfaces (All, Pending, Escrow, Delivery, Pharmacy
 * Responses, Disputes) read through the /api/medenquiry* routes behind RBAC.
 * Row shapes stay snake_case, mirroring the Part AA useTransactions pattern.
 */

import { apiFetch } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MedEnquiryStatus =
  | "pending_match"
  | "matched"
  | "in_escrow"
  | "pickup_ready"
  | "delivery_in_progress"
  | "completed"
  | "cancelled";

export const MED_ENQUIRY_STATUSES: MedEnquiryStatus[] = [
  "pending_match", "matched", "in_escrow", "pickup_ready",
  "delivery_in_progress", "completed", "cancelled",
];

export type MedEnquiryType = "with_rx" | "otc" | "hcp_request";

export interface EnquiryResponseRow {
  id: string;
  price: number | null;
  available: boolean;
  status: "offered" | "accepted" | "declined" | "expired";
  responder_kind: "pharmacy" | "wholesaler";
  responded_at: string | null;
  notes?: string | null;
  currency?: string;
  facility?: { facility_name: string | null; area: string | null } | null;
}

export interface MedEnquiryRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  medication_name: string;
  medication_description: string | null;
  dosage: string | null;
  quantity: number | null;
  unit: string | null;
  urgency: "normal" | "urgent" | "emergency" | string | null;
  status: MedEnquiryStatus | string;
  enquiry_type: MedEnquiryType | string | null;
  fulfilment_mode: "pickup" | "delivery" | string | null;
  delivery_status: string | null;
  delivery_address: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_distance_km: number | null;
  payment_amount: number | null;
  prescription_url: string | null;
  pickup_confirmation_code: string | null;
  notify_on_availability: boolean | null;
  search_radius_km: number | null;
  custom_area: string | null;
  drug_id: string | null;
  user_id: string | null;
  // Server-derived fields
  submitter_name: string;
  submitter_region: string | null;
  identity_masked: boolean;
  pharmacy_name: string | null;
  escrow_amount: number | null;
  escrow_status: string | null;
  response_count: number;
  best_price: number | null;
  best_pharmacy: string | null;
  responses?: EnquiryResponseRow[];
  user?: { first_name: string | null; last_name: string | null; region?: string | null } | null;
  pharmacy?: { facility_name: string | null; area?: string | null; region?: string | null } | null;
  escrow?: {
    id: string;
    amount: number | null;
    status: string | null;
    dispute_reason?: string | null;
    dispute_raised_at?: string | null;
  } | null;
}

export interface MedEnquiryOverview {
  kpis: {
    total_enquiries_30d: number;
    new_this_week: number;
    pending_unmatched: number;
    escrow_active_count: number;
    escrow_amount_held: number;
    delivery_in_progress: number;
    open_disputes: number;
    match_rate_pct: number;
  };
  pharmacy_performance: PharmacyPerfRow[];
}

export interface PharmacyPerfRow {
  pharmacy_id: string | null;
  pharmacy_name: string;
  total_responses: number;
  avg_response_minutes: number | null;
  availability_rate: number;
  orders_fulfilled: number;
  rating: number | null;
  active: boolean | null;
}

export interface DisputeRow {
  id: string;
  transaction_reference: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  dispute_reason: string | null;
  dispute_raised_at: string | null;
  dispute_resolved_at: string | null;
  dispute_resolution: string | null;
  enquiry: {
    id: string;
    medication_name: string;
    dosage: string | null;
    status: string;
    fulfilment_mode: string | null;
    delivery_proof_url: string | null;
    user: { first_name: string | null; last_name: string | null } | null;
    pharmacy: { facility_name: string | null } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const MEDENQ_QUERY_KEYS = {
  all: ["medenquiry"] as const,
  lists: () => [...MEDENQ_QUERY_KEYS.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...MEDENQ_QUERY_KEYS.lists(), params] as const,
  overview: () => [...MEDENQ_QUERY_KEYS.all, "overview"] as const,
  pharmacies: () => [...MEDENQ_QUERY_KEYS.all, "pharmacies"] as const,
  disputes: () => [...MEDENQ_QUERY_KEYS.all, "disputes"] as const,
};

// ---------------------------------------------------------------------------
// Enquiry list
// ---------------------------------------------------------------------------

export type MedEnquiryListParams = {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
  status?: string;
  tier?: string;
};

export const useMedEnquiries = (params: MedEnquiryListParams = {}) => {
  const resolved = { page: 1, limit: 25, ...params };
  return useQuery<{ rows: MedEnquiryRow[]; total: number }, Error>({
    queryKey: MEDENQ_QUERY_KEYS.list(resolved),
    queryFn: async () => {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(resolved)) {
        if (value === undefined || value === null || value === "") continue;
        qs.set(key, String(value));
      }
      const result = await apiFetch<{
        ok: boolean;
        rows: MedEnquiryRow[];
        total: number;
      }>(`/api/medenquiry?${qs.toString()}`);
      return { rows: result.rows, total: result.total };
    },
  });
};

// ---------------------------------------------------------------------------
// Overview KPIs (graceful pre-migration)
// ---------------------------------------------------------------------------

export const useMedEnquiryOverview = () => {
  return useQuery<{ empty: boolean; overview: MedEnquiryOverview | null }, Error>({
    queryKey: MEDENQ_QUERY_KEYS.overview(),
    queryFn: async () => {
      const result = await apiFetch<{
        ok: boolean;
        empty: boolean;
        overview: MedEnquiryOverview | null;
      }>("/api/medenquiry/overview");
      return { empty: result.empty, overview: result.overview };
    },
  });
};

// ---------------------------------------------------------------------------
// Pharmacy performance leaderboard
// ---------------------------------------------------------------------------

export const usePharmacyPerformance = () => {
  return useQuery<{ empty: boolean; rows: PharmacyPerfRow[] }, Error>({
    queryKey: MEDENQ_QUERY_KEYS.pharmacies(),
    queryFn: async () => {
      const result = await apiFetch<{
        ok: boolean;
        empty: boolean;
        rows: PharmacyPerfRow[];
      }>("/api/medenquiry/pharmacies");
      return { empty: result.empty, rows: result.rows };
    },
  });
};

// ---------------------------------------------------------------------------
// Lifecycle actions (notify / pickup-ready / confirm-delivery / cancel)
// ---------------------------------------------------------------------------

export type MedEnquiryAction =
  | "notify_user"
  | "mark_pickup_ready"
  | "confirm_delivery"
  | "cancel";

export const useMedEnquiryAction = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; action: MedEnquiryAction; note?: string }>({
    mutationFn: async ({ id, action, note }) => {
      await apiFetch<{ ok: boolean }>(`/api/medenquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
    },
    onSuccess: async (_, { action }) => {
      await queryClient.invalidateQueries({ queryKey: MEDENQ_QUERY_KEYS.all });
      toast.success(
        action === "notify_user"
          ? "User notified"
          : action === "mark_pickup_ready"
            ? "Marked ready for pickup — confirmation code issued"
            : action === "confirm_delivery"
              ? "Delivery confirmed — order completed"
              : "Enquiry cancelled",
      );
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Pharmacy broadcast
// ---------------------------------------------------------------------------

export const useBroadcastEnquiry = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const result = await apiFetch<{ ok: boolean; pharmacies_notified?: number }>(
        `/api/medenquiry/${id}/broadcast`,
        { method: "POST" },
      );
      toast.success(`Broadcast sent to ${result.pharmacies_notified ?? 0} pharmacies`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEDENQ_QUERY_KEYS.all });
    },
    onError: (error) => toast.error(`Broadcast failed: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Escrow release / refund (transactions.manage)
// ---------------------------------------------------------------------------

export const useEscrowAction = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; action: "release" | "refund"; reason?: string }>({
    mutationFn: async ({ id, action, reason }) => {
      await apiFetch<{ ok: boolean }>(`/api/medenquiry/${id}/escrow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
    },
    onSuccess: async (_, { action }) => {
      await queryClient.invalidateQueries({ queryKey: MEDENQ_QUERY_KEYS.all });
      toast.success(action === "release" ? "Escrow released to pharmacy" : "Escrow refunded to user");
    },
    onError: (error) => toast.error(`Escrow ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Escrow disputes
// ---------------------------------------------------------------------------

export const useDisputes = () => {
  return useQuery<{ rows: DisputeRow[] }, Error>({
    queryKey: MEDENQ_QUERY_KEYS.disputes(),
    queryFn: async () =>
      apiFetch<{ ok: boolean; rows: DisputeRow[] }>("/api/medenquiry/disputes"),
  });
};

export const useResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; verdict: "release_to_pharmacy" | "refund_user"; resolution_notes?: string }
  >({
    mutationFn: async ({ id, verdict, resolution_notes }) => {
      await apiFetch<{ ok: boolean }>(`/api/medenquiry/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, resolution_notes }),
      });
    },
    onSuccess: async (_, { verdict }) => {
      await queryClient.invalidateQueries({ queryKey: MEDENQ_QUERY_KEYS.all });
      toast.success(verdict === "release_to_pharmacy" ? "Funds released to pharmacy" : "User refunded");
    },
    onError: (error) => toast.error(`Dispute resolution failed: ${error.message}`),
  });
};
