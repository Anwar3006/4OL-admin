import { useMutation } from "@tanstack/react-query";
import type {
  RegisterProviderAccountInput,
  RegisterProviderAccountResult,
  CredentialDeliveryResult,
} from "@/features/providers/schema/types";

export const useRegisterProviderAccount = () =>
  useMutation<RegisterProviderAccountResult, Error, RegisterProviderAccountInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/admin/providers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to register the provider account.");
      }
      return res.json();
    },
  });

export const useResendProviderInvite = () =>
  useMutation<{ deliveries: CredentialDeliveryResult[] }, Error, string>({
    mutationFn: async (providerId) => {
      const res = await fetch(`/api/admin/providers/${providerId}/resend-invite`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to resend the invite.");
      }
      return res.json();
    },
  });
