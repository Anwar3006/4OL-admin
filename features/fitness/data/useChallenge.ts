import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";
import { TChallengeInput, TChallengeOutput } from "@/schemas/challenge.schema";

const supabase = getBrowserClient();

export const CHALLENGE_QUERY_KEYS = {
  all: ["fitness_challenges"] as const,
  lists: () => [...CHALLENGE_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...CHALLENGE_QUERY_KEYS.lists(), { ...params }] as const,
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
    queryKey: CHALLENGE_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_challenges")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        challenges: (data || []) as TChallengeOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
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
      const { data, error } = await supabase
        .from("fitness_challenges")
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
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_challenges")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success("Challenge created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create challenge: ${error.message}`);
    },
  });
};

export const useUpdateChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TChallengeInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_challenges")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success("Challenge updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update challenge: ${error.message}`);
    },
  });
};

export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fitness_challenges")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGE_QUERY_KEYS.all });
      toast.success("Challenge deleted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete challenge: ${error.message}`);
    },
  });
};
