import { supabase } from "@/lib/supabase";
import {
  TSymptomsInput,
  TSymptomsOutput,
} from "@/types/symptoms";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

type Pagination = {
  page: number;
  limit: number;
  search?: string;
};

interface PaginatedResponse {
  symptoms: TSymptomsOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
  // analytics: {
  //   mostAffectedBodyParts: any[];
  //   totalCategories: number;
  // };
}

export const SYMPTOMS_QUERY_KEYS = {
  all: ["symptoms"] as const,
  stats: () => ["stats"] as const,
  bodyparts: ["bodyparts"] as const,
  categories: ["categories"] as const,
  lists: () => [...SYMPTOMS_QUERY_KEYS.all, "lists"] as const,
  list: (param: Pagination) => [...SYMPTOMS_QUERY_KEYS.lists(), param] as const,
  details: () => [...SYMPTOMS_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) => [...SYMPTOMS_QUERY_KEYS.details(), id] as const,
};

// ============ Query Hooks ============
export const useSymptoms = ({
  page,
  limit,
  search,
}: Pagination & { search?: string }) => {
  return useQuery<PaginatedResponse, Error>({
    queryKey: SYMPTOMS_QUERY_KEYS.list({ page, limit, search }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Select symptoms with their linked categories and body parts
      let query = supabase.from("symptoms").select(
        `
          *,
          symptom_categories (categories (id, name)),
          symptom_body_parts (body_parts (id, name)),
          symptom_types (*),
          symptom_causes (*)
          `,
        { count: "exact" },
      );

      // Robust Search
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      const formattedData = data.map((symptom) => {
        const {
          symptom_body_parts,
          symptom_categories,
          symptom_causes,
          symptom_types,
          ...rest
        } = symptom;

        // Format the data for the UI
        // We map the junction tables to simple arrays of IDs
        return {
          ...rest,
          bodyParts: symptom_body_parts,
          categories: symptom_categories,
          causes: symptom_causes,
          types: symptom_types,
        };
      });

      return {
        symptoms: formattedData as TSymptomsOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
  });
};

export const useSymptom = (id: string) => {
  return useQuery<any, Error>({
    queryKey: SYMPTOMS_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptoms")
        .select(
          `
          *,
          symptom_body_parts (body_part_id),
          symptom_categories (category_id),
          symptom_types (*),
          symptom_causes (*)
          `,
        )
        .eq("id", id)
        .single();

      if (error) {
        // PGRST116 is the "JSON object requested, but no rows returned" error
        if (error.code === "PGRST116") {
          throw new Error(`Symptom with ID ${id} not found.`);
        }
        throw new Error(error.message);
      }

      const {
        symptom_body_parts,
        symptom_categories,
        symptom_causes,
        symptom_types,
        ...rest
      } = data;

      // Format the data for the UI
      // We map the junction tables to simple arrays of IDs
      return {
        ...rest,
        bodyParts: symptom_body_parts,
        categories: symptom_categories,
        causes: symptom_causes,
        types: symptom_types,
      };
    },
    enabled: !!id, // Only run if ID exists
  });
};

export const useBodyPartsForSymptoms = () => {
  return useQuery<any, Error>({
    queryKey: SYMPTOMS_QUERY_KEYS.bodyparts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_parts")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useCategoriesForSymptoms = () => {
  return useQuery<any, Error>({
    queryKey: SYMPTOMS_QUERY_KEYS.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useSymptomStats = () => {
  return useQuery({
    queryKey: SYMPTOMS_QUERY_KEYS.stats(),
    queryFn: async () => {
      const [categoriesResults, bodyPartsRpc, systemicResults] =
        await Promise.all([
          // Total active categories used by symptoms
          supabase
            .from("categories")
            .select("id", { count: "exact", head: true }),

          // Your custom spatial/ltree RPC
          supabase.rpc("get_body_part_stats"),

          // Systemic vs Localized breakdown
          supabase
            .from("symptoms")
            .select("is_systemic", { count: "exact" })
            .eq("is_systemic", true),
        ]);

      if (categoriesResults.error) throw categoriesResults.error;
      if (bodyPartsRpc.error) throw bodyPartsRpc.error;

      return {
        totalCategories: categoriesResults.count ?? 0,
        bodyPartDistribution: bodyPartsRpc.data,
        systemicCount: systemicResults.count ?? 0,
        lastUpdated: new Date().toISOString(),
      };
    },
    // Stats don't change as often as the list, so we can cache longer
    staleTime: 1000 * 60 * 5,
  });
};
// =========== Mutation Hooks ==========

export const useCreateSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, TSymptomsInput>({
    mutationFn: async (data) => {
      const { data: symptomId, error } = await supabase.rpc(
        "register_symptom_complex",
        {
          s_payload: {
            name: data.name,
            slug: data.slug as string,
            nhs_link: data.nhs_link,
            image_url: data.image_url,
            about: data.about,
            is_systemic: data.is_systemic,
            diagnosis: data.diagnosis,
            treatment: data.treatment,
            complications: data.complications,
            prevention: data.prevention,
            specialist: data.specialist_to_contact,
            contact_your_doctor: data.contact_your_doctor,
            more_information: data.more_information,
            attribution: data.attribution,
          },
          body_part_ids: data.bodyParts,
          category_ids: data.categories,
          s_types: data.types,
          s_causes: data.causes,
        },
      );
      if (error) throw new Error(error.message);
      return symptomId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SYMPTOMS_QUERY_KEYS.all,
      });
      toast.success("Symptom created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create symptom: ${error.message}`);
    },
  });
};

export const useUpdateSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data, error } = await supabase.rpc("update_symptom_complex", {
        s_id: id,
        s_payload: payload,
        body_part_ids: payload.bodyParts,
        category_ids: payload.categories,
        s_types: payload.types,
        s_causes: payload.causes,
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Refresh the specific symptom and the general list
      queryClient.invalidateQueries({ queryKey: SYMPTOMS_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: SYMPTOMS_QUERY_KEYS.detail(data.id),
      });
      toast.success("Symptom updated successfully");
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
};

export const useDeleteSymptom = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (symptomId: string) => {
      // 1. Fetch the symptom to get the image path
      const { data: symptom } = await supabase
        .from("symptoms")
        .select("image_url")
        .eq("id", symptomId)
        .single();

      // 2. Delete the image from storage if it exists
      if (symptom?.image_url) {
        await supabase.storage
          .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME as string)
          .remove([symptom.image_url]);
      }

      // 3. Delete the database record (triggers cascading delete)
      const { error } = await supabase
        .from("symptoms")
        .delete()
        .eq("id", symptomId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate the symptoms list to refresh the UI
      queryClient.invalidateQueries({ queryKey: SYMPTOMS_QUERY_KEYS.all });
      toast.success("Symptom and all related data deleted successfully");
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
    },
  });
};
