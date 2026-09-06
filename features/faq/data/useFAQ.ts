import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { TFAQInput, TFAQOutput } from "@/features/faq/schema/types";
import { toast } from "sonner";

// Query Keys
export const FAQ_QUERY_KEYS = {
  all: ["faqs"] as const,
  categories: ["categories"] as const,
  lists: () => [...FAQ_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number, search?: string) =>
    [...FAQ_QUERY_KEYS.lists(), { page, limit, search }] as const,
  details: () => [...FAQ_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...FAQ_QUERY_KEYS.details(), id] as const,
};

// Types
interface PaginatedFAQsResponse {
  faqs: TFAQOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

interface UseFAQsParams {
  page: number;
  limit: number;
  search?: string;
}

// ============= QUERY HOOKS =============

/**
 * Fetch paginated FAQs
 */
export const useFAQs = ({ page, limit, search }: UseFAQsParams) => {
  return useQuery<PaginatedFAQsResponse, Error>({
    queryKey: FAQ_QUERY_KEYS.list(page, limit, search),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getBrowserClient();
      let query = supabase
        .from("faqs")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
      }

      const {
        data: faqs,
        count,
        error,
      } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        faqs: (faqs || []) as TFAQOutput[],
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
 * Fetch single FAQ by ID
 */
export const useFAQ = (id: string | null) => {
  return useQuery<TFAQOutput, Error>({
    queryKey: FAQ_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw new Error(error.message);
      return data as TFAQOutput;
    },
    enabled: !!id, // Only run query if id is provided
  });
};

export const useFAQCategories = () => {
  return useQuery<any, Error>({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("faq_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

/**
 * Real FAQ KPI stats — replaces the FAQStats.tsx card that used to
 * hardcode Active FAQs/Categories/Views, plus a fabricated "AI Deflection
 * Rate" with no source at all. Deflection (queries resolved by the
 * chatbot/FAQ without ever becoming a support ticket) genuinely can't be
 * computed yet — it needs chatbot-side event logging (Epic 30.1's
 * analytics_events, not built), so that metric is dropped rather than
 * faked, per Epic 19.5.
 */
export const useFAQStats = () => {
  return useQuery({
    queryKey: [...FAQ_QUERY_KEYS.all, "stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const [faqsResult, categoriesResult] = await Promise.all([
        supabase
          .from("faqs")
          .select("status, view_count, helpful_count, not_helpful_count"),
        supabase.from("faq_categories").select("id", { count: "exact", head: true }),
      ]);

      if (faqsResult.error) throw new Error(faqsResult.error.message);
      if (categoriesResult.error) throw new Error(categoriesResult.error.message);

      const rows = faqsResult.data || [];
      const activeFaqs = rows.filter((r) => r.status === "published").length;
      const totalViews = rows.reduce((sum, r) => sum + (r.view_count || 0), 0);
      const totalHelpful = rows.reduce((sum, r) => sum + (r.helpful_count || 0), 0);
      const totalNotHelpful = rows.reduce(
        (sum, r) => sum + (r.not_helpful_count || 0),
        0,
      );
      const totalFeedback = totalHelpful + totalNotHelpful;

      return {
        totalFaqs: rows.length,
        activeFaqs,
        categories: categoriesResult.count ?? 0,
        totalViews,
        // "Helpful Rate" from real thumbs-up/down counts — a legitimate
        // stand-in for what "AI Deflection Rate" was trying to gesture at,
        // without inventing a number. Null (not 0%) when nobody has voted
        // yet, so the UI can show "No feedback yet" instead of a fake 0%.
        helpfulRate:
          totalFeedback === 0
            ? null
            : Math.round((totalHelpful / totalFeedback) * 100),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

// ============= MUTATION HOOKS =============

/**
 * Create new FAQ
 */
export const useCreateFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation<TFAQOutput, Error, TFAQInput>({
    mutationFn: async (faqData) => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("faqs")
        .insert({
          question: faqData.question,
          answer: faqData.answer,
          category_id: faqData.category_id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TFAQOutput;
    },
    onSuccess: () => {
      // Invalidate all FAQ queries to refetch data
      queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEYS.all });
      toast.success("FAQ created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create FAQ: ${error.message}`);
    },
  });
};

/**
 * Update existing FAQ
 */
export const useUpdateFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TFAQOutput,
    Error,
    { id: string; data: Partial<TFAQInput> }
  >({
    mutationFn: async ({ id, data: faqData }) => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("faqs")
        .update({
          question: faqData.question,
          answer: faqData.answer,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TFAQOutput;
    },
    onSuccess: (data) => {
      // Invalidate all FAQ queries
      queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEYS.all });
      // Update specific FAQ in cache
      queryClient.setQueryData(FAQ_QUERY_KEYS.detail(data.id), data);
      toast.success("FAQ updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update FAQ: ${error.message}`);
    },
  });
};

/**
 * Delete FAQ
 */
export const useDeleteFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.from("faqs").delete().eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Invalidate all FAQ queries to refetch data
      queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEYS.all });
      toast.success("FAQ deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete FAQ: ${error.message}`);
    },
  });
};

export const useCreateFAQCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, any>({
    mutationFn: async ({ name }: { name: string }) => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("faq_categories")
        .insert({ name })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      // This forces the FAQ dropdown to refresh automatically
      queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEYS.categories });
    },
  });
};

// ============= CONVENIENCE HOOK =============

/**
 * All-in-one FAQ operations hook
 * Usage: const faq = useFAQOperations();
 * Then: faq.create.mutate(data), faq.update.mutate({id, data}), etc.
 */
export const useFAQOperations = () => {
  return {
    create: useCreateFAQ(),
    update: useUpdateFAQ(),
    delete: useDeleteFAQ(),
  };
};
