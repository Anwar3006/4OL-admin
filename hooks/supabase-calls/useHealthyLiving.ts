import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  list: (page: number, limit: number) =>
    [...HEALTHY_LIVING_QUERY_KEYS.lists(), { page, limit }] as const,
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
}: {
  page: number;
  limit: number;
}) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: HEALTHY_LIVING_QUERY_KEYS.list(page, limit),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const {
        data: healthyLivings,
        count,
        error,
      } = await supabase
        .from("healthy_living")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        healthyLivings: (healthyLivings || []) as THealthyLivingOutput[],
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
      const { data, error } = await supabase
        .from("healthy_living")
        .select(
          `
          *,
          healthy_living_types (
            id,
            type_name,
            about_type
          )
        `,
        )
        .eq("id", id!)
        .single();

      if (error) throw new Error(error.message);
      const transformPayload = {
        ...data,
        types: data?.healthy_living_types,
        healthy_living_types: undefined,
      } as THealthyLivingOutput;
      console.log("Trans:  ", transformPayload);
      return transformPayload;
    },
    enabled: !!id,
  });
};

// ============= MUTATION HOOKS =============

/**
 * Create new healthy living item
 * Note: This handles the transaction for main item + types
 */
export const useCreateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<
    THealthyLivingOutput,
    Error,
    THealthyLivingInput & { slug: string }
  >({
    mutationFn: async (input) => {
      // Start a transaction-like operation
      // 1. Insert main healthy living record
      const { data: healthyLiving, error: mainError } = await supabase
        .from("healthy_living")
        .insert({
          name: input.name,
          slug: input.slug,
          about: input.about,
          category: input.category,
          image_url: input.image_url,
          contact_your_doctor: input.contact_your_doctor,
          more_information: input.more_information,
          attribution: input.attribution,
        })
        .select()
        .single();

      if (mainError) throw new Error(mainError.message);

      // 2. Insert related types if provided
      if (input.types && input.types.length > 0) {
        const typesData = input.types.map((type) => ({
          healthy_living_id: healthyLiving.id,
          type_name: type.type_name,
          about_type: type.about_type,
        }));

        const { error: typesError } = await supabase
          .from("healthy_living_types")
          .insert(typesData);

        if (typesError) {
          // Rollback: delete the main record
          await supabase
            .from("healthy_living")
            .delete()
            .eq("id", healthyLiving.id);
          throw new Error(typesError.message);
        }
      }

      return healthyLiving as THealthyLivingOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.all,
      });
      toast.success("Healthy living item created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
};

/**
 * Update healthy living item
 */
export const useUpdateHealthyLiving = () => {
  const queryClient = useQueryClient();

  return useMutation<
    THealthyLivingOutput,
    Error,
    { id: string; data: Partial<THealthyLivingInput> }
  >({
    mutationFn: async ({ id, data: input }) => {
      // 1. Update main record
      const { data: healthyLiving, error: mainError } = await supabase
        .from("healthy_living")
        .update({
          name: input.name,
          about: input.about,
          category: input.category,
          image_url: input.image_url,
          contact_your_doctor: input.contact_your_doctor,
          more_information: input.more_information,
          attribution: input.attribution,
        })
        .eq("id", id)
        .select()
        .single();

      if (mainError) throw new Error(mainError.message);

      // 2. Update types if provided
      if (input.types) {
        // Delete existing types
        const { error: deleteError } = await supabase
          .from("healthy_living_types")
          .delete()
          .eq("healthy_living_id", id);

        if (deleteError) throw new Error(deleteError.message);

        // Insert new types
        if (input.types.length > 0) {
          const typesData = input.types.map((type) => ({
            healthy_living_id: id,
            type_name: type.type_name,
            about_type: type.about_type,
          }));

          const { error: insertError } = await supabase
            .from("healthy_living_types")
            .insert(typesData);

          if (insertError) throw new Error(insertError.message);
        }
      }

      return healthyLiving as THealthyLivingOutput;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: HEALTHY_LIVING_QUERY_KEYS.detail(data.id),
      });
      // queryClient.setQueryData(HEALTHY_LIVING_QUERY_KEYS.detail(data.id), data);
      toast.success("Healthy living item updated successfully!");
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
      // Supabase will handle cascade delete of related types if configured
      const { error } = await supabase
        .from("healthy_living")
        .delete()
        .eq("id", id);

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
