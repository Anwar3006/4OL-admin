import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, jsonBody } from "@/lib/api-fetch";
import type { CapabilityOption, CredentialTypeOption, ProviderTypeOption } from "../schema/types";

const QUERY_KEYS = {
  providerTypes: ["providers", "settings", "provider-types"] as const,
  credentialTypes: ["providers", "settings", "credential-types"] as const,
  capabilities: ["providers", "settings", "capabilities"] as const,
};

// ── provider_types ───────────────────────────────────────────────────────

export function useProviderTypesSettings() {
  return useQuery<{ data: ProviderTypeOption[] }, Error>({
    queryKey: QUERY_KEYS.providerTypes,
    queryFn: () => apiFetch("/api/providers/settings/provider-types"),
  });
}

export function useSaveProviderType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { isNew: boolean } & Partial<ProviderTypeOption> & { key: string }) => {
      const { isNew, ...payload } = input;
      return apiFetch<{ ok: boolean }>("/api/providers/settings/provider-types", {
        ...jsonBody(payload),
        method: isNew ? "POST" : "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerTypes });
      queryClient.invalidateQueries({ queryKey: ["providers", "options"] });
      toast.success("Provider type saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── credential_types ─────────────────────────────────────────────────────

export function useCredentialTypesSettings() {
  return useQuery<{ data: CredentialTypeOption[] }, Error>({
    queryKey: QUERY_KEYS.credentialTypes,
    queryFn: () => apiFetch("/api/providers/settings/credential-types"),
  });
}

export function useSaveCredentialType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { isNew: boolean } & Partial<CredentialTypeOption> & { key: string }) => {
      const { isNew, ...payload } = input;
      return apiFetch<{ ok: boolean }>("/api/providers/settings/credential-types", {
        ...jsonBody(payload),
        method: isNew ? "POST" : "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.credentialTypes });
      toast.success("Credential type saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ── capabilities ─────────────────────────────────────────────────────────

export function useCapabilitiesSettings() {
  return useQuery<{ data: CapabilityOption[] }, Error>({
    queryKey: QUERY_KEYS.capabilities,
    queryFn: () => apiFetch("/api/providers/settings/capabilities"),
  });
}

export function useSaveCapability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { isNew: boolean } & Partial<CapabilityOption> & { key: string }) => {
      const { isNew, ...payload } = input;
      return apiFetch<{ ok: boolean }>("/api/providers/settings/capabilities", {
        ...jsonBody(payload),
        method: isNew ? "POST" : "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.capabilities });
      toast.success("Capability saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
