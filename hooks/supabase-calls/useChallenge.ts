import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";
import { TChallengeInput, TChallengeOutput } from "@/schemas/challenge.schema";

const CHALLENGE_TABLE = "healthy_living_challenge";

export const CHALLENGE_QUERY_KEYS = {
  all: ["challenges"] as const,
  lists: () => [...CHALLENGE_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number, search?: string) =>
    [...CHALLENGE_QUERY_KEYS.lists(), { page, limit, search }] as const,
  details: () => [...CHALLENGE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CHALLENGE_QUERY_KEYS.details(), id] as const,
};

export const useChallenges = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: CHALLENGE_QUERY_KEYS.list(page, limit, search),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const supabase = await getSupabaseClient();
      let query = supabase.from(CHALLENGE_TABLE).select("*", { count: "exact" });
      if (search) {
        query = query.or(`name.ilike.%${search}%,type.ilike.%${search}%`);
      }
      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return {
        challenges: data as TChallengeOutput[],
        meta: {
          totalPages: Math.ceil((count || 0) / limit),
          total: count || 0,
          currentPage: page,
        },
      };
    },
  });
};

export const useChallenge = (id: string | null) => {
  return useQuery({
    queryKey: CHALLENGE_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from(CHALLENGE_TABLE)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TChallengeOutput;
    },
    enabled: !!id,
  });
};

export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TChallengeInput) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from(CHALLENGE_TABLE)
        .insert(data)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success("Challenge created successfully!");
    },
  });
};

export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TChallengeInput }) => {
      const supabase = await getSupabaseClient();
      const { data: result, error } = await supabase
        .from(CHALLENGE_TABLE)
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.detail(result.id) }),
      ]);
      toast.success("Challenge updated successfully!");
    },
  });
};

export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.from(CHALLENGE_TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all }),
        queryClient.removeQueries({ queryKey: CHALLENGE_QUERY_KEYS.detail(id) }),
      ]);
      toast.success("Challenge deleted successfully!");
    },
  });
};
