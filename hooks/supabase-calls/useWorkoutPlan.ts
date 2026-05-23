import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TWorkoutPlanInput, TWorkoutPlanOutput } from "@/schemas/workout-plan.schema";

export const WORKOUT_PLAN_QUERY_KEYS = {
  all: ["workout_plans"] as const,
  lists: () => [...WORKOUT_PLAN_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...WORKOUT_PLAN_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...WORKOUT_PLAN_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...WORKOUT_PLAN_QUERY_KEYS.details(), id] as const,
};

export const useWorkoutPlans = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: WORKOUT_PLAN_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("workout_plans")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        plans: (data || []) as TWorkoutPlanOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

export const useCreateWorkoutPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TWorkoutPlanInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("workout_plans")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_PLAN_QUERY_KEYS.all });
      toast.success("Workout plan created!");
    },
  });
};

export const useUpdateWorkoutPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TWorkoutPlanInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("workout_plans")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_PLAN_QUERY_KEYS.all });
      toast.success("Workout plan updated!");
    },
  });
};

export const useDeleteWorkoutPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_PLAN_QUERY_KEYS.all });
      toast.success("Workout plan deleted!");
    },
  });
};
