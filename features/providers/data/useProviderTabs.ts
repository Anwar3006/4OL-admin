import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";
import type {
  ProviderActivityRow,
  ProviderCapabilityRow,
  ProviderCatalogueItemRow,
  ProviderCredentialRow,
  ProviderDeliveryRow,
  ProviderQueuesResponse,
  ProviderReviewRow,
  ProviderSubscriptionRow,
} from "../schema/types";

const keyFor = (id: string, tab: string) => ["providers", "detail", id, tab] as const;

// ── Credentials ──────────────────────────────────────────────────────────

export function useProviderCredentials(providerId: string) {
  return useQuery<{ data: ProviderCredentialRow[] }, Error>({
    queryKey: keyFor(providerId, "credentials"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/credentials`),
  });
}

export function useReviewCredential(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { credentialId: string; status: "verified" | "rejected"; rejection_reason?: string }) =>
      apiFetch<{ ok: boolean }>(`/api/providers/${providerId}/credentials/${input.credentialId}`, {
        ...jsonBody({ status: input.status, rejection_reason: input.rejection_reason }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "credentials") });
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "capabilities") });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success(variables.status === "verified" ? "Credential verified" : "Credential rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── Capabilities ─────────────────────────────────────────────────────────

export function useProviderCapabilities(providerId: string) {
  return useQuery<{ data: ProviderCapabilityRow[] }, Error>({
    queryKey: keyFor(providerId, "capabilities"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/capabilities`),
  });
}

export function useGrantCapabilityOverride(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { capability: string; reason: string }) =>
      apiFetch<{ ok: boolean }>(`/api/providers/${providerId}/capabilities`, jsonBody(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "capabilities") });
      toast.success("Capability granted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRevokeCapability(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (capability: string) =>
      apiFetch<{ ok: boolean }>(`/api/providers/${providerId}/capabilities?capability=${encodeURIComponent(capability)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "capabilities") });
      toast.success("Capability revoked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── Catalogue ────────────────────────────────────────────────────────────

export function useProviderCatalogue(providerId: string) {
  return useQuery<{ data: ProviderCatalogueItemRow[] }, Error>({
    queryKey: keyFor(providerId, "catalogue"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/catalogue`),
  });
}

export function useReviewCatalogueItem(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; status: "published" | "rejected"; rejection_reason?: string }) =>
      apiFetch<{ ok: boolean }>(`/api/providers/${providerId}/catalogue/${input.itemId}`, {
        ...jsonBody({ status: input.status, rejection_reason: input.rejection_reason }),
        method: "PATCH",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "catalogue") });
      toast.success(variables.status === "published" ? "Item published" : "Item rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── Reviews ──────────────────────────────────────────────────────────────

export function useProviderReviews(providerId: string) {
  return useQuery<{ data: ProviderReviewRow[] }, Error>({
    queryKey: keyFor(providerId, "reviews"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/reviews`),
  });
}

export function useModerateReview(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; status: "approved" | "rejected" }) =>
      apiFetch<{ ok: boolean }>(`/api/providers/${providerId}/reviews/${input.reviewId}`, {
        ...jsonBody({ status: input.status }),
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(providerId, "reviews") });
      toast.success("Review updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── Subscription / Deliveries / Activity (read-only) ────────────────────

export function useProviderSubscription(providerId: string) {
  return useQuery<{ data: ProviderSubscriptionRow[] }, Error>({
    queryKey: keyFor(providerId, "subscription"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/subscription`),
  });
}

export function useProviderDeliveries(providerId: string) {
  return useQuery<{ data: ProviderDeliveryRow[] }, Error>({
    queryKey: keyFor(providerId, "deliveries"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/deliveries`),
  });
}

export function useProviderActivity(providerId: string) {
  return useQuery<{ data: ProviderActivityRow[] }, Error>({
    queryKey: keyFor(providerId, "activity"),
    queryFn: () => apiFetch(`/api/providers/${providerId}/activity`),
  });
}

// ── Admin home queues ────────────────────────────────────────────────────

export function useProviderQueues() {
  return useQuery<ProviderQueuesResponse, Error>({
    queryKey: ["providers", "queues"],
    queryFn: () => apiFetch("/api/providers/queues"),
    staleTime: 30_000,
  });
}
