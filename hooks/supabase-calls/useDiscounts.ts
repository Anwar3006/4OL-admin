/**
 * Marketing discount hooks — Gap Analysis Part M Phase 3 retrofit.
 * Migrated off client-side Supabase onto /api/marketing/discounts
 * (marketing.view/create/edit/delete). Row shapes stay snake_case to match
 * the previous runtime behaviour of the dialogs/tables.
 */

import { apiFetch } from "@/lib/api-fetch";
import {
  TMarketingDiscountInput,
  TMarketingDiscountOutput,
} from "@/schemas/marketing-discount.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaginatedResponse {
  data: TMarketingDiscountOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
  analytics?: {
    active_codes: number;
    total_uses: number;
    avg_discount_pct: number;
  };
}

type DiscountPaginationInput = {
  page: number;
  limit: number;
  search?: string;
  activeOnly?: boolean;
};

export const MARKETING_DISCOUNT_QUERY_KEYS = {
  all: ["marketing-discounts"] as const,
  lists: () => [...MARKETING_DISCOUNT_QUERY_KEYS.all, "lists"] as const,
  list: (params: DiscountPaginationInput) =>
    [...MARKETING_DISCOUNT_QUERY_KEYS.lists(), params] as const,
  details: () => [...MARKETING_DISCOUNT_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) =>
    [...MARKETING_DISCOUNT_QUERY_KEYS.details(), id] as const,
};

export const useMarketingDiscounts = ({
  page,
  limit,
  search,
  activeOnly = false,
}: DiscountPaginationInput) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: MARKETING_DISCOUNT_QUERY_KEYS.list({
      page,
      limit,
      search,
      activeOnly,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (activeOnly) params.set("status", "active");
      return apiFetch<PaginatedResponse>(`/api/marketing/discounts?${params.toString()}`);
    },
  });
};

export const useMarketingDiscount = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery<TMarketingDiscountOutput, Error>({
    queryKey: MARKETING_DISCOUNT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const result = await apiFetch<{ data: TMarketingDiscountOutput }>(
        `/api/marketing/discounts/${id}`,
      );
      return result.data;
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

const buildCreatePayload = (data: TMarketingDiscountInput & Record<string, unknown>) => {
  const {
    discountValue,
    discountType,
    maxUses,
    validFrom,
    validUntil,
    isActive,
    appliesTo,
    applicableItems,
    ...rest
  } = data;

  return {
    ...rest, // name, description, code (+ any new segmentation fields)
    discount_value: discountValue,
    discount_type: discountType,
    max_uses: maxUses,
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: isActive,
    applies_to: appliesTo,
    applicable_items: applicableItems,
  };
};

export const useCreateMarketingDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<TMarketingDiscountOutput, Error, TMarketingDiscountInput & Record<string, unknown>>({
    mutationFn: async (data) => {
      const result = await apiFetch<{ data: TMarketingDiscountOutput }>(
        "/api/marketing/discounts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCreatePayload(data)),
        },
      );
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: MARKETING_DISCOUNT_QUERY_KEYS.all,
      });
      toast.success("Discount created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create discount: ${error.message}`);
    },
  });
};

export const useUpdateMarketingDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TMarketingDiscountOutput,
    Error,
    { id: string; data: Partial<TMarketingDiscountInput> & Record<string, unknown> }
  >({
    mutationFn: async ({ id, data: input }) => {
      const inputData: Record<string, unknown> = { ...input };
      // Map any camelCase keys the dialogs still emit onto column names.
      if ("discountValue" in inputData) inputData.discount_value = inputData.discountValue;
      if ("discountType" in inputData) inputData.discount_type = inputData.discountType;
      if ("maxUses" in inputData) inputData.max_uses = inputData.maxUses;
      if ("validFrom" in inputData) inputData.valid_from = inputData.validFrom;
      if ("validUntil" in inputData) inputData.valid_until = inputData.validUntil;
      if ("isActive" in inputData) inputData.is_active = inputData.isActive;
      if ("appliesTo" in inputData) inputData.applies_to = inputData.appliesTo;
      if ("applicableItems" in inputData) inputData.applicable_items = inputData.applicableItems;
      delete inputData.discountValue;
      delete inputData.discountType;
      delete inputData.maxUses;
      delete inputData.validFrom;
      delete inputData.validUntil;
      delete inputData.isActive;
      delete inputData.appliesTo;
      delete inputData.applicableItems;

      const result = await apiFetch<{ data: TMarketingDiscountOutput }>(
        `/api/marketing/discounts/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inputData),
        },
      );
      return result.data;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: MARKETING_DISCOUNT_QUERY_KEYS.all,
        }),
        queryClient.invalidateQueries({
          queryKey: MARKETING_DISCOUNT_QUERY_KEYS.detail(result.id),
        }),
      ]);
      toast.success("Discount updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update discount: ${error.message}`);
    },
  });
};

export const useDeleteMarketingDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiFetch<{ ok: boolean }>(`/api/marketing/discounts/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: MARKETING_DISCOUNT_QUERY_KEYS.all,
        }),
        queryClient.removeQueries({
          queryKey: MARKETING_DISCOUNT_QUERY_KEYS.detail(id),
        }),
      ]);
      toast.success("Discount deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete discount: ${error.message}`);
    },
  });
};
