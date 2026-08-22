import { getSupabaseClient } from "@/lib/supabase";
import { apiFetch, jsonBody } from "@/lib/api-fetch";
import { TSymptomsInput, TSymptomsOutput } from "@/types/symptoms";
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
      const supabase = await getSupabaseClient();
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
        .order("name", { ascending: true })
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
          bodyParts:
            symptom_body_parts?.map((b: any) => b.body_parts?.name) || [],
          categories:
            symptom_categories?.map((c: any) => c.categories?.name) || [],
          causes: symptom_causes,
          types: symptom_types?.map((t: any) => t.type_name) || [],
          // The table's "Views" column reads `views`, but the DB column is
          // `view_count` (already spread in via `...rest`) — alias it so
          // the column isn't silently always "0".
          views: rest.view_count ?? 0,
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
      const supabase = await getSupabaseClient();
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
      const { data, error } = await (await getSupabaseClient())
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
      const { data, error } = await (await getSupabaseClient())
        .from("categories")
        .select("*")
        // Symptom taxonomy only — the categories table is shared with
        // conditions (and healthy living), and the form's TreeMultiSelect
        // was previously offering every category regardless of type.
        .eq("type", "symptom")
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
      const [
        categoriesResults,
        bodyPartsRpc,
        systemicResults,
        totalSymptomsResult,
        reviewedResult,
      ] = await Promise.all([
        // Total active categories used by symptoms
        (await getSupabaseClient())
          .from("categories")
          .select("id", { count: "exact", head: true }),

        // Your custom spatial/ltree RPC
        (await getSupabaseClient()).rpc("get_body_part_stats"),

        // Systemic vs Localized breakdown
        (await getSupabaseClient())
          .from("symptoms")
          .select("is_systemic", { count: "exact" })
          .eq("is_systemic", true),

        // Total symptoms (absolute)
        (await getSupabaseClient())
          .from("symptoms")
          .select("id", { count: "exact", head: true }),

        // Reviewed count — real basis for "Verification Rate" (there's no
        // separate verification table; `reviewed_at` on the row is what
        // exists, so that's what the rate is computed from).
        (await getSupabaseClient())
          .from("symptoms")
          .select("id", { count: "exact", head: true })
          .not("reviewed_at", "is", null),
      ]);

      if (categoriesResults.error) throw categoriesResults.error;
      if (bodyPartsRpc.error) throw bodyPartsRpc.error;
      if (reviewedResult.error) throw reviewedResult.error;

      const totalSymptoms = totalSymptomsResult.count ?? 0;
      const reviewedCount = reviewedResult.count ?? 0;

      return {
        totalCategories: categoriesResults.count ?? 0,
        bodyPartDistribution: bodyPartsRpc.data,
        systemicCount: systemicResults.count ?? 0,
        totalSymptoms,
        verificationRate:
          totalSymptoms === 0
            ? 0
            : Math.round((reviewedCount / totalSymptoms) * 100),
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
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
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

// ============ Analytics + Carousel hooks (Analytics/Carousels build) ============

export interface SymptomAnalytics {
  totals: {
    total: number;
    published: number;
    draft: number;
    pending_review: number;
    archived: number;
    views: number;
    reviewed: number;
    systemic: number;
    featured: number;
    uncategorised: number;
    unique_viewers_30d: number;
  };
  verification_rate: number;
  view_trend_30d: { date: string; views: number }[];
  body_parts: { body_part_id: string; body_part_name: string; symptom_count: number }[];
  categories: { category_id: string; category_name: string; symptom_count: number }[];
  top_viewed: { id: string; name: string; value: number }[];
  top_liked: { id: string; name: string; value: number }[];
  top_saved: { id: string; name: string; value: number }[];
  engagement: { likes: number; saves: number; unique_engagers: number } | null;
  engagement_pipeline_live: boolean;
  completeness: {
    avg_sections: number;
    incomplete: { id: string; name: string; sections: number }[];
  };
}

/** GET /api/symptoms/analytics — RBAC-guarded analytics (symptoms.view). */
export const useSymptomAnalyticsApi = (enabled: boolean) => {
  return useQuery<SymptomAnalytics, Error>({
    queryKey: [...SYMPTOMS_QUERY_KEYS.all, "analytics-api"] as const,
    queryFn: () => apiFetch<SymptomAnalytics>("/api/symptoms/analytics"),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
};

/** PUT /api/symptoms/[id]/feature — carousel slot assign/remove (symptoms.feature). */
export const useFeatureSymptom = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; updated: number },
    Error,
    { id: string; ids?: string[]; featured: boolean; position?: number }
  >({
    mutationFn: ({ id, ids, featured, position }) =>
      apiFetch(`/api/symptoms/${id}/feature`, {
        ...jsonBody({ ids, featured, position }),
        method: "PUT",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: SYMPTOMS_QUERY_KEYS.all });
      toast.success(
        vars.featured
          ? `${vars.ids?.length ?? 1} symptom(s) added to the carousel.`
          : `${vars.ids?.length ?? 1} symptom(s) removed from the carousel.`,
      );
    },
    onError: (error) => {
      toast.error(`Carousel update failed: ${error.message}`);
    },
  });
};

/** Carousel tab data — featured set (slot order) + published candidates. */
export const useSymptomsCarousel = () => {
  const fetchCarouselData = async () => {
    const supabase = await getSupabaseClient();
    const [featuredRes, availableRes] = await Promise.all([
      supabase
        .from("symptoms")
        .select("id, name, status, view_count, featured_order, featured_from")
        .eq("is_featured", true)
        .order("featured_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("symptoms")
        .select("id, name, status, view_count")
        .eq("status", "published")
        .neq("is_featured", true)
        .order("view_count", { ascending: false })
        .limit(20),
    ]);
    if (featuredRes.error) throw new Error(featuredRes.error.message);
    if (availableRes.error) throw new Error(availableRes.error.message);
    return { featured: featuredRes.data ?? [], available: availableRes.data ?? [] };
  };

  return useQuery<{ featured: any[]; available: any[] }, Error>({
    queryKey: [...SYMPTOMS_QUERY_KEYS.all, "carousel"] as const,
    queryFn: fetchCarouselData,
    staleTime: 1000 * 60 * 2,
  });
};

export interface SymptomCategoryRow {
  category_id: string;
  category_name: string;
  level: number;
  symptom_count: number;
  total_views: number;
  published_count: number;
}

/**
 * Categories tab data — per-category symptom counts/views aggregated from
 * the symptom_categories junction, plus the uncategorised queue.
 */
export const useSymptomCategoriesTab = () => {
  const fetchCategoriesTab = async () => {
    const supabase = await getSupabaseClient();

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, level")
      .eq("type", "symptom")
      .order("name", { ascending: true });
    if (catError) throw new Error(catError.message);

    const { data: junctions, error: junctionError } = await supabase
      .from("symptom_categories")
      .select("category_id, symptoms (id, name, status, view_count)");
    if (junctionError) throw new Error(junctionError.message);

    const linkedIds = new Set<string>();
    const byCategory = new Map<string, { count: number; views: number; published: number }>();
    for (const row of (junctions ?? []) as any[]) {
      const symptom = row.symptoms;
      if (!symptom) continue;
      linkedIds.add(symptom.id);
      const bucket = byCategory.get(row.category_id) ?? {
        count: 0,
        views: 0,
        published: 0,
      };
      bucket.count += 1;
      bucket.views += symptom.view_count ?? 0;
      if (symptom.status === "published") bucket.published += 1;
      byCategory.set(row.category_id, bucket);
    }

    const rows: SymptomCategoryRow[] = (categories ?? [])
      .map((cat: any) => {
        const bucket = byCategory.get(cat.id) ?? { count: 0, views: 0, published: 0 };
        return {
          category_id: cat.id,
          category_name: cat.name,
          level: cat.level ?? 0,
          symptom_count: bucket.count,
          total_views: bucket.views,
          published_count: bucket.published,
        };
      })
      .sort((a, b) => b.symptom_count - a.symptom_count);

    // Uncategorised queue — symptoms absent from the junction.
    let uncategorised: any[] = [];
    let query = supabase
      .from("symptoms")
      .select("id, name, status, view_count")
      .order("name", { ascending: true })
      .limit(20);
    if (linkedIds.size > 0) {
      query = query.not("id", "in", `(${[...linkedIds].join(",")})`);
    }
    const { data: uncategorisedRows, error: uncategorisedError } = await query;
    if (uncategorisedError) throw new Error(uncategorisedError.message);
    uncategorised = uncategorisedRows ?? [];

    return { rows, uncategorised, linkedCount: linkedIds.size };
  };

  return useQuery<
    { rows: SymptomCategoryRow[]; uncategorised: any[]; linkedCount: number },
    Error
  >({
    queryKey: [...SYMPTOMS_QUERY_KEYS.all, "categories-tab"] as const,
    queryFn: fetchCategoriesTab,
    staleTime: 1000 * 60 * 2,
  });
};
