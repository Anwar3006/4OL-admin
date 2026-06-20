import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import {
  TFitnessOutdoorRouteInput,
  TFitnessOutdoorRouteOutput,
  TFitnessOutdoorEventInput,
  TFitnessOutdoorEventOutput,
  TFitnessOutdoorReviewInput,
  TFitnessOutdoorReviewOutput,
} from "@/schemas/fitness-outdoor.schema";

const supabase = getSupabaseBrowserClient();

export const OUTDOOR_QUERY_KEYS = {
  allRoutes: ["fitness_outdoor_routes"] as const,
  routeLists: () => [...OUTDOOR_QUERY_KEYS.allRoutes, "list"] as const,
  routeList: (params: { page: number; limit: number; search?: string; difficulty?: string }) =>
    [...OUTDOOR_QUERY_KEYS.routeLists(), { ...params }] as const,
  routeDetails: () => [...OUTDOOR_QUERY_KEYS.allRoutes, "detail"] as const,
  routeDetail: (id: string) => [...OUTDOOR_QUERY_KEYS.routeDetails(), id] as const,

  allEvents: ["fitness_outdoor_events"] as const,
  eventLists: () => [...OUTDOOR_QUERY_KEYS.allEvents, "list"] as const,
  eventList: (params: { page: number; limit: number; search?: string; status?: string }) =>
    [...OUTDOOR_QUERY_KEYS.eventLists(), { ...params }] as const,
  eventDetails: () => [...OUTDOOR_QUERY_KEYS.allEvents, "detail"] as const,
  eventDetail: (id: string) => [...OUTDOOR_QUERY_KEYS.eventDetails(), id] as const,

  allReviews: ["fitness_outdoor_reviews"] as const,
  reviewLists: () => [...OUTDOOR_QUERY_KEYS.allReviews, "list"] as const,
  reviewList: (params: { page: number; limit: number; search?: string; rating?: string }) =>
    [...OUTDOOR_QUERY_KEYS.reviewLists(), { ...params }] as const,
  reviewDetails: () => [...OUTDOOR_QUERY_KEYS.allReviews, "detail"] as const,
  reviewDetail: (id: string) => [...OUTDOOR_QUERY_KEYS.reviewDetails(), id] as const,
};

// =============================================================================
// ROUTES HOOKS
// =============================================================================

export const useFitnessOutdoorRoutes = ({
  page,
  limit,
  search,
  difficulty,
}: {
  page: number;
  limit: number;
  search?: string;
  difficulty?: string;
}) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.routeList({ page, limit, search, difficulty }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_outdoor_routes")
        .select(`
          *,
          creator:user_profiles!fitness_outdoor_routes_created_by_fkey(first_name, last_name),
          verifier:user_profiles!fitness_outdoor_routes_verified_by_fkey(first_name, last_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      if (difficulty && difficulty !== "all") {
        query = query.eq("difficulty", difficulty);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        routes: (data || []) as TFitnessOutdoorRouteOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useFitnessOutdoorRoute = (id: string | null) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.routeDetail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_outdoor_routes")
        .select(`
          *,
          creator:user_profiles!fitness_outdoor_routes_created_by_fkey(first_name, last_name),
          verifier:user_profiles!fitness_outdoor_routes_verified_by_fkey(first_name, last_name)
        `)
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TFitnessOutdoorRouteOutput;
    },
    enabled: !!id,
  });
};

export const useCreateFitnessOutdoorRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TFitnessOutdoorRouteInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_routes")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorRouteOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allRoutes });
      toast.success("Route created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });
};

export const useUpdateFitnessOutdoorRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TFitnessOutdoorRouteInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_routes")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorRouteOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allRoutes });
      toast.success("Route updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });
};

export const useDeleteFitnessOutdoorRoute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_outdoor_routes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allRoutes });
      toast.success("Route deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route: ${error.message}`);
    },
  });
};

// =============================================================================
// EVENTS HOOKS
// =============================================================================

export const useFitnessOutdoorEvents = ({
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
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.eventList({ page, limit, search, status }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_outdoor_events")
        .select(`
          *,
          route:fitness_outdoor_routes(name),
          creator:user_profiles!fitness_outdoor_events_created_by_fkey(first_name, last_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        events: (data || []) as TFitnessOutdoorEventOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useFitnessOutdoorEvent = (id: string | null) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.eventDetail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_outdoor_events")
        .select(`
          *,
          route:fitness_outdoor_routes(name),
          creator:user_profiles!fitness_outdoor_events_created_by_fkey(first_name, last_name)
        `)
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TFitnessOutdoorEventOutput;
    },
    enabled: !!id,
  });
};

export const useCreateFitnessOutdoorEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TFitnessOutdoorEventInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_events")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorEventOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allEvents });
      toast.success("Event created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create event: ${error.message}`);
    },
  });
};

export const useUpdateFitnessOutdoorEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TFitnessOutdoorEventInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_events")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorEventOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allEvents });
      toast.success("Event updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update event: ${error.message}`);
    },
  });
};

export const useDeleteFitnessOutdoorEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_outdoor_events").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allEvents });
      toast.success("Event deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete event: ${error.message}`);
    },
  });
};

// =============================================================================
// REVIEWS HOOKS
// =============================================================================

export const useFitnessOutdoorReviews = ({
  page,
  limit,
  search,
  rating,
}: {
  page: number;
  limit: number;
  search?: string;
  rating?: string;
}) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.reviewList({ page, limit, search, rating }),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("fitness_outdoor_reviews")
        .select(`
          *,
          route:fitness_outdoor_routes(name),
          user:user_profiles!fitness_outdoor_reviews_user_id_fkey(first_name, last_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("comment", `%${search}%`);
      }

      if (rating && rating !== "all") {
        query = query.eq("rating", parseInt(rating));
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw new Error(error.message);

      const total = count ?? 0;
      return {
        reviews: (data || []) as TFitnessOutdoorReviewOutput[],
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useFitnessOutdoorReview = (id: string | null) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.reviewDetail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_outdoor_reviews")
        .select(`
          *,
          route:fitness_outdoor_routes(name),
          user:user_profiles!fitness_outdoor_reviews_user_id_fkey(first_name, last_name)
        `)
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as TFitnessOutdoorReviewOutput;
    },
    enabled: !!id,
  });
};

export const useCreateFitnessOutdoorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TFitnessOutdoorReviewInput) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_reviews")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorReviewOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allReviews });
      toast.success("Review created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create review: ${error.message}`);
    },
  });
};

export const useUpdateFitnessOutdoorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TFitnessOutdoorReviewInput }) => {
      const payload = { ...data };
      delete payload.id;
      const { data: result, error } = await supabase
        .from("fitness_outdoor_reviews")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return result as TFitnessOutdoorReviewOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allReviews });
      toast.success("Review updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update review: ${error.message}`);
    },
  });
};

export const useDeleteFitnessOutdoorReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_outdoor_reviews").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allReviews });
      toast.success("Review deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete review: ${error.message}`);
    },
  });
};
