import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { TFitnessPlanInput, TFitnessPlanOutput } from "@/schemas/fitness-plan.schema";

const supabase = getSupabaseBrowserClient();

export const FITNESS_PLAN_QUERY_KEYS = {
  all: ["fitness_plans"] as const,
  lists: () => [...FITNESS_PLAN_QUERY_KEYS.all, "list"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...FITNESS_PLAN_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...FITNESS_PLAN_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...FITNESS_PLAN_QUERY_KEYS.details(), id] as const,
};

export const useFitnessPlans = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: FITNESS_PLAN_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_plans")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        plans: (data || []) as TFitnessPlanOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

export const useCreateFitnessPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TFitnessPlanInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_plans")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FITNESS_PLAN_QUERY_KEYS.all });
      toast.success("Fitness plan created!");
    },
  });
};

export const useUpdateFitnessPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TFitnessPlanInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_plans")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FITNESS_PLAN_QUERY_KEYS.all });
      toast.success("Fitness plan updated!");
    },
  });
};

export const useDeleteFitnessPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_plans").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FITNESS_PLAN_QUERY_KEYS.all });
      toast.success("Fitness plan deleted!");
    },
  });
};
