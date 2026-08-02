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
  categories: ["healthy-living-categories"] as const,
};

interface PaginatedResponse {
  healthyLivings: THealthyLivingOutput[];
  meta: { totalPages: number; total: number; currentPage: number };
}

/** Categories admins can tag a healthy living article with (type='healthy_living'). */
export const useCategoriesForHealthyLiving = () => {
  return useQuery<any, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.categories,
    queryFn: async () => {
      const { data, error } = await (await getSupabaseClient())
        .from("categories")
        .select("*")
        .eq("type", "healthy_living")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

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
        .select("*, healthy_living_categories (categories (id, name))", { count: "exact" });

      if (search) query = query.ilike("name", `%${search}%`);
      if (status) query = query.eq("status", status);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;
      const formatted = (data || []).map((row: any) => {
        const { healthy_living_categories, ...rest } = row;
        return {
          ...rest,
          categories:
            healthy_living_categories?.map((c: any) => c.categories?.name) || [],
        };
      });
      return {
        healthyLivings: formatted as unknown as THealthyLivingOutput[],
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
        .select("*, healthy_living_categories (category_id, categories (id, name))")
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      const { healthy_living_categories, ...rest } = data as any;
      return {
        ...rest,
        categories: healthy_living_categories || [],
      } as unknown as THealthyLivingOutput;
    },
    enabled: !!id,
  });
};

export const useCreateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<THealthyLivingOutput, Error, THealthyLivingInput>({
    mutationFn: async (input) => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
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

      const categoryIds = input.categories || [];
      if (categoryIds.length > 0) {
        const { error: catError } = await supabase
          .from("healthy_living_categories")
          .insert(
            categoryIds.map((category_id) => ({
              healthy_living_id: data.id,
              category_id,
            })),
          );
        if (catError) throw new Error(catError.message);
      }

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
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
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

      // Re-sync category tags: clear out the old set and write the new one.
      // Simpler and safer than a diff for a list this small, and matches how
      // symptoms/conditions handle their category junctions via RPC.
      const { error: deleteError } = await supabase
        .from("healthy_living_categories")
        .delete()
        .eq("healthy_living_id", id);
      if (deleteError) throw new Error(deleteError.message);

      const categoryIds = input.categories || [];
      if (categoryIds.length > 0) {
        const { error: catError } = await supabase
          .from("healthy_living_categories")
          .insert(
            categoryIds.map((category_id) => ({
              healthy_living_id: id,
              category_id,
            })),
          );
        if (catError) throw new Error(catError.message);
      }

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
