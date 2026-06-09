import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { TTrainerInput, TTrainerOutput } from "@/schemas/trainer.schema";

const supabase = getSupabaseBrowserClient();

export const TRAINER_QUERY_KEYS = {
  all: ["fitness_trainers"] as const,
  lists: () => [...TRAINER_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...TRAINER_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...TRAINER_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...TRAINER_QUERY_KEYS.details(), id] as const,
};

export const useTrainers = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_trainers")
        .select("*, user_profiles(first_name, last_name, email, avatar_url)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        // Search by user profile fields via join
        query = query.or(`user_profiles.first_name.ilike.%${search}%,user_profiles.last_name.ilike.%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        trainers: (data || []) as TTrainerOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

export const useTrainer = (id: string | null) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_trainers")
        .select("*, user_profiles(first_name, last_name, email, avatar_url)")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TTrainerOutput;
    },
    enabled: !!id,
  });
};

export const useCreateTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TTrainerInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_trainers")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success("Trainer profile created!");
    },
  });
};

export const useUpdateTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TTrainerInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_trainers")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success("Trainer profile updated!");
    },
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_trainers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success("Trainer profile deleted!");
    },
  });
};
