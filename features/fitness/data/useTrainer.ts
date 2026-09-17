import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";
import { TTrainerInput, TTrainerOutput } from "@/features/fitness/schema/trainer";

const supabase = getBrowserClient();

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
  enabled = true,
}: {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      // Goes through an API route, not getBrowserClient(), because the
      // trainer's email lives in auth.users -- PostgREST can't embed it off
      // user_profiles (no email column there) and resolving it needs the
      // service role. See features/fitness/api/trainers.ts.
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/fitness/trainers?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load trainers.");
      }
      return (await res.json()) as {
        trainers: TTrainerOutput[];
        meta: { total: number; totalPages: number; currentPage: number };
      };
    },
    enabled,
  });
};

export const useTrainer = (id: string | null) => {
  return useQuery({
    queryKey: TRAINER_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const res = await fetch(`/api/fitness/trainers?id=${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load trainer.");
      }
      return (await res.json()) as TTrainerOutput;
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
    onError: (error: Error) => {
      toast.error(`Failed to create trainer profile: ${error.message}`);
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
    onError: (error: Error) => {
      toast.error(`Failed to update trainer profile: ${error.message}`);
    },
  });
};

/**
 * Trainer verification (Gap Analysis Part V, m-review-trainer). Approving
 * documents flips is_verified + status; revoking reverses both.
 */
export const useVerifyTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      verify,
    }: {
      id: string;
      verify: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from("fitness_trainers")
        .update(
          verify
            ? { is_verified: true, verified_at: new Date().toISOString(), status: "active" }
            : { is_verified: false, verified_at: null, status: "pending" },
        )
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success(
        variables.verify
          ? "Trainer verified and activated!"
          : "Trainer verification revoked.",
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to update verification: ${error.message}`);
    },
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fitness_trainers")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINER_QUERY_KEYS.all });
      toast.success("Trainer profile deleted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete trainer profile: ${error.message}`);
    },
  });
};
