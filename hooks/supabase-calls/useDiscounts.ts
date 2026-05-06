import { getSupabaseClient } from "@/lib/supabase";
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
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getSupabaseClient();
      let query = supabase
        .from("marketing_discounts")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const result = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (result.error) throw result.error;

      const totalCount = result.count ?? 0;

      return {
        data: result.data as TMarketingDiscountOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
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
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("marketing_discounts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as TMarketingDiscountOutput;
    },
    enabled: enabled,
  });
};

// =============== Mutation Hooks ============

export const useCreateMarketingDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<TMarketingDiscountOutput, Error, TMarketingDiscountInput>({
    mutationFn: async (data: TMarketingDiscountInput) => {
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

  // 3. Assemble the final object using only the keys Postgres expects
  const inputData = {
    ...rest, // This includes name, description, code
    discount_value: discountValue,
    discount_type: discountType,
    max_uses: maxUses,
    valid_from: validFrom,
    valid_until: validUntil,
    is_active: isActive,
    applies_to: appliesTo,
    applicable_items: applicableItems,
  };

      console.log("Input: ", inputData)
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from("marketing_discounts")
        .insert(inputData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingDiscountOutput;
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
    { id: string; data: Partial<TMarketingDiscountInput> }
  >({
    mutationFn: async ({ id, data: input }) => {
      const inputData = {
        ...input,
        discount_value: input.discountValue,
        discount_type: input.discountType,
        max_uses: input.maxUses,
        valid_from: input.validFrom,
        valid_until: input.validUntil,
        is_active: input.isActive,
        applies_to: input.appliesTo,
        applicable_items: input.applicableItems,
      };
      const supabase = await getSupabaseClient();

      const { data: result, error } = await supabase
        .from("marketing_discounts")
        .update(inputData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result as TMarketingDiscountOutput;
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
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("marketing_discounts")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message);
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
