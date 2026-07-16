import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
  THealthyLivingInput,
  THealthyLivingOutput,
} from "@/schemas/healthyLiving.schema";

// Query Keys
export const HEALTHY_LIVING_QUERY_KEYS = {
  all: ["healthy-living"] as const,
  lists: () => [...HEALTHY_LIVING_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number, search?: string, status?: string) =>
    [...HEALTHY_LIVING_QUERY_KEYS.lists(), { page, limit, search, status }] as const,
  details: () => [...HEALTHY_LIVING_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...HEALTHY_LIVING_QUERY_KEYS.details(), id] as const,
};

interface PaginatedResponse {
  healthyLivings: THealthyLivingOutput[];
  meta: { totalPages: number; total: number; currentPage: number };
}

/** Paginated flat list — no more nesting/tree, so simple offset pagination. */
export const useHealthyLivings = ({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.list(page, limit, search, status),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = (await getSupabaseClient())
        .from("healthy_living_info")
        .select("*", { count: "exact" });

      if (search) query = query.ilike("name", `%${search}%`);
      if (status) query = query.eq("status", status);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;
      return {
        healthyLivings: (data || []) as unknown as THealthyLivingOutput[],
        meta: {
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          total: totalCount,
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

/** Single item — flat, no children/tree join needed anymore. */
export const useHealthyLiving = (id: string | null) => {
  return useQuery<THealthyLivingOutput, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await (await getSupabaseClient())
        .from("healthy_living_info")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as THealthyLivingOutput;
    },
    enabled: !!id,
  });
};

export const useCreateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<THealthyLivingOutput, Error, THealthyLivingInput>({
    mutationFn: async (input) => {
      const { data, error } = await (await getSupabaseClient())
        .from("healthy_living_info")
        .insert([
          {
            name: input.name,
            slug: input.slug,
            description: input.description || null,
            content: input.content || {},
            image_url: input.image_url || null,
            attribution: input.attribution || {},
            status: input.status || "published",
          },
        ])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as THealthyLivingOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEALTHY_LIVING_QUERY_KEYS.all });
      toast.success("Saved successfully!");
    },
    onError: (error) => toast.error(`Failed to save: ${error.message}`),
  });
};

export const useUpdateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<
    THealthyLivingOutput,
    Error,
    { id: string; data: THealthyLivingInput }
  >({
    mutationFn: async ({ id, data: input }) => {
      const { data, error } = await (await getSupabaseClient())
        .from("healthy_living_info")
        .update({
          name: input.name,
          slug: input.slug,
          description: input.description || null,
          content: input.content || {},
          image_url: input.image_url || null,
          attribution: input.attribution || {},
          status: input.status || "published",
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as THealthyLivingOutput;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: HEALTHY_LIVING_QUERY_KEYS.all });
      toast.success("Updated successfully!");
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`),
  });
};

export const useDeleteHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await (await getSupabaseClient())
        .from("healthy_living_info")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEALTHY_LIVING_QUERY_KEYS.all });
      toast.success("Deleted successfully!");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useHealthyLivingOperations = () => ({
  create: useCreateHealthyLiving(),
  update: useUpdateHealthyLiving(),
  delete: useDeleteHealthyLiving(),
});
