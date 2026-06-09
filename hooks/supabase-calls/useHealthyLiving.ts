import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

// Import your types from the schema
import {
  THealthyLivingInput,
  THealthyLivingOutput,
} from "@/schemas/healthyLiving.schema";

// Query Keys
export const HEALTHY_LIVING_QUERY_KEYS = {
  all: ["healthy-living"] as const,
  lists: () => [...HEALTHY_LIVING_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number, search?: string) =>
    [...HEALTHY_LIVING_QUERY_KEYS.lists(), { page, limit, search }] as const,
  details: () => [...HEALTHY_LIVING_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...HEALTHY_LIVING_QUERY_KEYS.details(), id] as const,
};

interface PaginatedResponse {
  healthyLivings: THealthyLivingOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

// ============= QUERY HOOKS =============

/**
 * Fetch paginated healthy living items
 */
export const useHealthyLivings = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.list(page, limit, search),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = (await getSupabaseClient())
        .from("healthy_living_info")
        .select("*", { count: "exact" });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const {
        data: healthyLivings,
        count,
        error,
      } = await query
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        healthyLivings: (healthyLivings ||
          []) as unknown as THealthyLivingOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch single healthy living item with related types
 */
export const useHealthyLiving = (id: string | null) => {
  return useQuery<THealthyLivingOutput, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const { data, error } = await (
        await getSupabaseClient()
      )
        .from("healthy_living_info")
        .select(
          `
          *,
          children:healthy_living_info(
            *,
            children:healthy_living_info(*)
          )
        `,
        )
        .eq("id", id!)
        .single();

      if (error) throw new Error(error.message);

      // content_sections is stored as a JSON string in the DB — parse it back to an array
      const normalize = (record: any): any => ({
        ...record,
        content_sections:
          typeof record.content_sections === "string"
            ? JSON.parse(record.content_sections)
            : (record.content_sections ?? []),
        children: (record.children ?? []).map(normalize),
      });

      return normalize(data) as unknown as THealthyLivingOutput;
    },
    enabled: !!id,
  });
};

// ============= MUTATION HOOKS =============

/**
 * Recursive function to insert a tree of healthy living items
 */
const insertHealthyLivingTree = async (input: any) => {
  if (input.tree) {
    // Tree insert
    const { data: node, error } = await (
      await getSupabaseClient()
    ).rpc("insert_healthy_living_info_tree", {
      p_node: input.tree,
      p_parent_id: input.parent_id || null,
    });
    if (error) throw new Error(error.message);
    return node;
  }

  // Single node insert
  const { data: node, error } = await (
    await getSupabaseClient()
  )
    .rpc("insert_healthy_living_info", {
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description || null,
      p_content_sections: JSON.stringify(input.content_sections || []),
      p_parent_id: input.parent_id || null,
      p_image_url: input.image_url || null,
      p_attribution: JSON.stringify(input.attribution || {}),
    })
    .single();

  if (error) throw new Error(error.message);
  return node;
};

/**
 * Create new healthy living item (with hierarchy)
 */
export const useCreateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<THealthyLivingOutput, Error, any>({
    mutationFn: async (input) => {
      const node = await insertHealthyLivingTree(input);
      return node as unknown as THealthyLivingOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.all,
      });
      toast.success("Saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
};

/**
 * Update healthy living item
 */
export const useUpdateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<THealthyLivingOutput, Error, { id: string; data: any }>({
    mutationFn: async ({ id, data: input }) => {
      const { data: healthyLiving, error } = await (
        await getSupabaseClient()
      )
        .rpc("update_healthy_living_info", {
          p_id: id,
          p_name: input.name,
          p_slug: input.slug,
          p_description: input.description || null,
          p_content_sections: JSON.stringify(input.content_sections || []),
          p_parent_id: input.parent_id || null,
          p_image_url: input.image_url || null,
          p_attribution: JSON.stringify(input.attribution || {}),
        })
        .single();

      if (error) throw new Error(error.message);

      return healthyLiving as unknown as THealthyLivingOutput;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.all,
      });
      toast.success("Updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

/**
 * Delete healthy living item
 */
export const useDeleteHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await (
        await getSupabaseClient()
      ).rpc("delete_healthy_living_info", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.all,
      });
      toast.success("Healthy living item deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
};

// ============= CONVENIENCE HOOK =============

/**
 * All-in-one healthy living operations hook
 */
export const useHealthyLivingOperations = () => {
  return {
    create: useCreateHealthyLiving(),
    update: useUpdateHealthyLiving(),
    delete: useDeleteHealthyLiving(),
  };
};
