import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const SUBSCRIPTION_QUERY_KEYS = {
  all: ["marketing_subscriptions"] as const,
  list: () => [...SUBSCRIPTION_QUERY_KEYS.all, "list"] as const,
};

export const useMarketingSubscriptions = () => {
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
