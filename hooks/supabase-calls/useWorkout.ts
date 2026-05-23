import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TWorkoutInput, TWorkoutOutput } from "@/schemas/workout.schema";

export const WORKOUT_QUERY_KEYS = {
  all: ["workouts"] as const,
  lists: () => [...WORKOUT_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...WORKOUT_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...WORKOUT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...WORKOUT_QUERY_KEYS.details(), id] as const,
};

// ============= QUERY HOOKS =============

export const useWorkouts = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: WORKOUT_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("workouts")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("exercise_name", `%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        workouts: (data || []) as TWorkoutOutput[],
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

export const useWorkout = (id: string | null) => {
  return useQuery({
    queryKey: WORKOUT_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TWorkoutOutput;
    },
    enabled: !!id,
  });
};

// ============= MUTATION HOOKS =============

export const useCreateWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TWorkoutInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("workouts")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TWorkoutOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_QUERY_KEYS.all });
      toast.success("Workout created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workout: ${error.message}`);
    },
  });
};

export const useUpdateWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TWorkoutInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("workouts")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TWorkoutOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_QUERY_KEYS.all });
      toast.success("Workout updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workout: ${error.message}`);
    },
  });
};

export const useDeleteWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_QUERY_KEYS.all });
      toast.success("Workout deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workout: ${error.message}`);
    },
  });
};
