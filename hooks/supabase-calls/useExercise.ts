import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { TExerciseInput, TExerciseOutput } from "@/schemas/exercise.schema";

const supabase = getSupabaseBrowserClient();

export const EXERCISE_QUERY_KEYS = {
  all: ["fitness_exercises"] as const,
  lists: () => [...EXERCISE_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...EXERCISE_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...EXERCISE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EXERCISE_QUERY_KEYS.details(), id] as const,
};

// ============= QUERY HOOKS =============

export const useExercises = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: EXERCISE_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_exercises")
        .select("*", { count: "exact" })
        // Updated here: sort by exercise_name in ascending order
        .order("exercise_name", { ascending: true });

      if (search) {
        query = query.ilike("exercise_name", `%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        exercises: (data || []) as TExerciseOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useExercise = (id: string | null) => {
  return useQuery({
    queryKey: EXERCISE_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_exercises")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TExerciseOutput;
    },
    enabled: !!id,
  });
};

// ============= MUTATION HOOKS =============

export const useCreateExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TExerciseInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_exercises")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TExerciseOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISE_QUERY_KEYS.all });
      toast.success("Exercise created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create exercise: ${error.message}`);
    },
  });
};

export const useUpdateExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TExerciseInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_exercises")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TExerciseOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISE_QUERY_KEYS.all });
      toast.success("Exercise updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update exercise: ${error.message}`);
    },
  });
};

export const useDeleteExercise = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fitness_exercises")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXERCISE_QUERY_KEYS.all });
      toast.success("Exercise deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete exercise: ${error.message}`);
    },
  });
};
