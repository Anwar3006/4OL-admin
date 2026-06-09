import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const supabase = getSupabaseBrowserClient();

export const PROFILE_QUERY_KEYS = {
  all: ["marketing_profile"] as const,
  list: () => [...PROFILE_QUERY_KEYS.all, "list"] as const,
};

export const useMarketingProfiles = () => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_profile")
        .select("*")
        .order("createdAt", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
