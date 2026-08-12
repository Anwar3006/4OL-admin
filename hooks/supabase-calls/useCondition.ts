import { getSupabaseClient } from "@/lib/supabase";
import {
  TConditionsInput,
  TConditionsOutput,
} from "@/schemas/conditions.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Pagination {
  limit: number;
  page: number;
  search: string;
}

interface PaginatedResponse {
  data: TConditionsOutput[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  analytics: {};
}

export const CONDITIONS_QUERY_KEYS = {
  all: ["conditions"] as const,
  lists: () => [...CONDITIONS_QUERY_KEYS.all, "lists"] as const,
  list: (params: Pagination) =>
    [...CONDITIONS_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...CONDITIONS_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) => [...CONDITIONS_QUERY_KEYS.details(), id] as const,
};

export const useConditions = ({
  params,
  enabled,
}: {
  params: Pagination;
  enabled: boolean;
}) => {
  return useQuery<any, Error>({
    queryKey: CONDITIONS_QUERY_KEYS.list(params),
    queryFn: async () => {
      const client = await getSupabaseClient();
      try {
        const { limit, page, search } = params;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = client.from("conditions").select(
          `
          *,
          condition_types (type_name, about_type),
          condition_causes (cause_name, other_possible_causes),
          condition_body_parts (
            body_parts (id, name, mesh_id)
          ),
          condition_categories (
            categories (id, name, path)
          )
        `,
          { count: "exact" },
        );

        if (search) {
          query = query.or(`name.ilike.%${search}%`);
        }

        const { data, count, error } = await query
          .order("name", { ascending: true })
          .range(from, to);
        if (error) throw error;

        const totalCount = count ?? 0;

        const newData = data.map((condition: any) => {
          const {
            condition_body_parts,
            condition_categories,
            condition_causes,
            condition_types,
            ...rest
          } = condition;

          return {
            ...rest,
            causes: condition_causes,
            bodyParts:
              condition_body_parts?.map((b: any) => b.body_parts?.name) || [],
            categories:
              condition_categories?.map((c: any) => c.categories?.name) || [],
            types: condition_types?.map((t: any) => t.type_name) || [],
          };
        });
        return {
          conditions: newData,
          meta: {
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
          },
        };
      } catch (error) {
        throw error;
      }
    },
    enabled: enabled,
  });
};

export const useCondition = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery<TConditionsOutput, Error>({
    queryKey: CONDITIONS_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const client = await getSupabaseClient();
      const { data, error } = await client
        .from("conditions")
        .select(
          `
          *,
          condition_types (type_name, about_type),
          condition_causes (cause_name, other_possible_causes),
          condition_body_parts (
            body_parts (id, name, mesh_id)
          ),
          condition_categories (
            categories (id, name, path)
          )
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);

      // Note: Data will come back with nested arrays like condition_body_parts[0].body_parts
      const {
        condition_body_parts,
        condition_categories,
        condition_causes,
        condition_types,
        ...rest
      } = data;
      return {
        ...rest,
        causes: condition_causes,
        bodyParts: condition_body_parts,
        categories: condition_categories,
        types: condition_types,
      } as unknown as TConditionsOutput;
    },
    enabled: enabled,
  });
};

export const useConditionStats = (enabled: boolean) => {
  return useQuery({
    queryKey: ["conditions-stats"],
    queryFn: async () => {
      const client = await getSupabaseClient();
      // 1. Get Total Categories Count
      const { count: totalCategories } = await client
        .from("categories")
        .select("*", { count: "exact", head: true });

      // 2. Fetch all junction data for global analytics
      // Note: For very large datasets, move this logic to a Postgres View
      const { data: analyticsData, error } = await client.from("conditions")
        .select(`
          view_count,
          reviewed_at,
          condition_categories (categories (name)),
          condition_body_parts (body_parts (name))
        `);

      if (error) throw error;

      const categoryCounts: Record<string, number> = {};
      const bodyPartCounts: Record<string, number> = {};
      let totalViews = 0;
      let reviewedCount = 0;

      analyticsData?.forEach((row: any) => {
        row.condition_categories?.forEach((c: any) => {
          const name = c.categories?.name;
          if (name) categoryCounts[name] = (categoryCounts[name] || 0) + 1;
        });
        row.condition_body_parts?.forEach((b: any) => {
          const name = b.body_parts?.name;
          if (name) bodyPartCounts[name] = (bodyPartCounts[name] || 0) + 1;
        });
        totalViews += row.view_count || 0;
        if (row.reviewed_at) reviewedCount += 1;
      });

      const getTop = (counts: Record<string, number>) =>
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

      const totalConditions = analyticsData?.length || 0;

      return {
        totalCategories: totalCategories || 0,
        mostRecurringCategory: getTop(categoryCounts)[0],
        mostAffectedBodyPart: getTop(bodyPartCounts)[0],
        // Real replacements for the KPI cards that used to hardcode
        // "Total Likes" (0) / "Avg Engagement" (0) — there's no likes/
        // engagement-event table (see Epic 30.1's analytics_events, not
        // built yet), so these use columns that actually exist instead.
        totalViews,
        reviewRate:
          totalConditions === 0
            ? 0
            : Math.round((reviewedCount / totalConditions) * 100),
      };
    },
    enabled,
    staleTime: 1000 * 60 * 5, // Stats don't need to refresh as often as the table
  });
};
//======================= Mutation Hooks ===============

export const useCreateCondition = () => {
  const queryClient = useQueryClient();

  return useMutation<string, Error, TConditionsInput>({
    mutationFn: async (input) => {
      const client = await getSupabaseClient();
      const { bodyParts, categories, types, causes, ...c_payload } = input;

      console.log("c_payload: ", c_payload);
      const { data: conditionId, error } = await client.rpc(
        "insert_condition",
        {
          c_payload: c_payload,
          bodypartsids: bodyParts,
          categoryids: categories,
          c_types: types,
          c_causes: causes,
        },
      );

      if (error) {
        const supabase = await getSupabaseClient();
        await supabase.storage
          .from("conditions")
          .remove(new Array(input.image_url as string));

        throw new Error(error.message);
      }
      return conditionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CONDITIONS_QUERY_KEYS.all,
      });
      toast.success("Condition created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create condition: ${error.message}`);
    },
  });
};

export const useUpdateCondition = () => {
  const queryClient = useQueryClient();

  return useMutation<string, Error, TConditionsOutput>({
    mutationFn: async (input) => {
      const client = await getSupabaseClient();
      const { bodyParts, categories, types, causes, ...c_payload } = input;

      const { data: conditionId, error } = await client.rpc(
        "update_condition",
        {
          c_id: input.id,
          c_payload: c_payload,
          bodypartsids: bodyParts,
          categoryids: categories,
          c_types: types,
          c_causes: causes,
        },
      );

      if (error) throw new Error(error.message);
      return conditionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CONDITIONS_QUERY_KEYS.all,
      });
      toast.success("Condition created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create condition: ${error.message}`);
    },
  });
};

export const useDeleteCondition = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: async ({
      id,
      imagePath,
    }: {
      id: string;
      imagePath: string[];
    }) => {
      const client = await getSupabaseClient();
      await Promise.all([
        client.from("conditions").delete().eq("id", id),

        client.from("condition_body_parts").delete().eq("condition_id", id),
        client.from("condition_categories").delete().eq("condition_id", id),

        client.from("condition_causes").delete().eq("condition_id", id),
        client.from("condition_types").delete().eq("condition_id", id),

        client.storage.from("conditions").remove(imagePath),
      ]);
    },
    onSuccess: () => {
      toast.success("Condtion successfully deleted!");
      queryClient.invalidateQueries({ queryKey: CONDITIONS_QUERY_KEYS.all });
    },
    onError: (error) => {
      toast.error("Error deleting condition: " + error.message);
    },
  });
};
