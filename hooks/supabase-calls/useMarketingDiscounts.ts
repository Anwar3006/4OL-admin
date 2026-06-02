import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const DISCOUNT_QUERY_KEYS = {
  all: ["marketing_discounts"] as const,
  list: () => [...DISCOUNT_QUERY_KEYS.all, "list"] as const,
};

export const useMarketingDiscounts = () => {
  return useQuery({
    queryKey: DISCOUNT_QUERY_KEYS.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_discounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
