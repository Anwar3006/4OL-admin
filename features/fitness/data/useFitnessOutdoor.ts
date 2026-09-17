import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";
import {
  TFitnessOutdoorRouteInput,
  TFitnessOutdoorRouteOutput,
  TFitnessOutdoorEventInput,
  TFitnessOutdoorEventOutput,
  TFitnessOutdoorReviewInput,
  TFitnessOutdoorReviewOutput,
} from "@/schemas/fitness-outdoor.schema";

const supabase = getBrowserClient();

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

  pendingRoutes: ["fitness_outdoor_routes", "pending"] as const,
  eventRegistrations: (eventId: string) =>
    ["fitness_outdoor_event_registrations", eventId] as const,
  incentives: ["fitness_outdoor_incentives"] as const,
  engagements: ["fitness_outdoor_engagements"] as const,
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

export interface FitnessOutdoorEngagementRow {
  id: string;
  user_id: string;
  user_name: string;
  target_type: "route" | "event";
  target_id: string;
  target_name: string;
  will_visit_at: string | null;
  completed_at: string | null;
  is_liked: boolean;
  rating: number | null;
  shared_count: number;
  created_at: string;
}

export interface FitnessOutdoorEngagementData {
  completions: FitnessOutdoorEngagementRow[];
  ratings: FitnessOutdoorEngagementRow[];
  plannedVisits: number;
  likes: number;
  isConfigured: boolean;
  setupMessage: string | null;
}

/** Mobile engagement rows that back the Outdoor Completion and Ratings tables. */
export const useFitnessOutdoorEngagements = () => {
  return useQuery<FitnessOutdoorEngagementData, Error>({
    queryKey: OUTDOOR_QUERY_KEYS.engagements,
    queryFn: async () => {
      const [recencyResult, completionsResult] = await Promise.all([
        // Backs ratings / planned visits / likes: none of those have their
        // own timestamp column, so "last touched" (updated_at, NOT NULL)
        // is the best available proxy for their recency.
        supabase
          .from("fitness_outdoor_engagements")
          .select("*, user:user_profiles(first_name,last_name)")
          .order("updated_at", { ascending: false })
          .limit(500),
        // Completions get their own query. completed_at is nullable, and
        // Postgres sorts NULLs first on DESC — ordering the shared feed by
        // completed_at would push every never-completed row (like-only,
        // rating-only, plan-only) ahead of real completions and could
        // squeeze them out of a fixed LIMIT entirely once a route gets
        // busy. Filtering to completed_at IS NOT NULL also lets this hit
        // fitness_outdoor_engagements_completed_idx (a partial index on
        // completed_at desc where completed_at is not null) instead of an
        // unindexed sort.
        supabase
          .from("fitness_outdoor_engagements")
          .select("*, user:user_profiles(first_name,last_name)")
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(500),
      ]);

      const isMissingEngagementTable = (error: { code?: string; message: string } | null) =>
        !!error &&
        (error.code === "PGRST205" ||
          (error.message.includes("fitness_outdoor_engagements") &&
            error.message.toLowerCase().includes("schema cache")));

      if (isMissingEngagementTable(recencyResult.error) || isMissingEngagementTable(completionsResult.error)) {
        return {
          completions: [],
          ratings: [],
          plannedVisits: 0,
          likes: 0,
          isConfigured: false,
          setupMessage:
            "Outdoor tracking is ready in the app code, but its database migration has not been applied to this Supabase project yet.",
        };
      }
      if (recencyResult.error) throw new Error(recencyResult.error.message);
      if (completionsResult.error) throw new Error(completionsResult.error.message);

      const recencyRows = (recencyResult.data ?? []) as any[];
      const completionRows = (completionsResult.data ?? []) as any[];
      const allRows = [...recencyRows, ...completionRows];

      const routeIds = [...new Set(allRows.filter((row) => row.target_type === "route").map((row) => row.target_id))];
      const eventIds = [...new Set(allRows.filter((row) => row.target_type === "event").map((row) => row.target_id))];

      const [routeResult, eventResult] = await Promise.all([
        routeIds.length
          ? supabase.from("fitness_outdoor_routes").select("id,name").in("id", routeIds)
          : Promise.resolve({ data: [], error: null }),
        eventIds.length
          ? supabase.from("fitness_outdoor_events").select("id,title").in("id", eventIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (routeResult.error) throw new Error(routeResult.error.message);
      if (eventResult.error) throw new Error(eventResult.error.message);

      const targetNames = new Map<string, string>();
      for (const route of routeResult.data ?? []) targetNames.set(`route:${route.id}`, route.name);
      for (const event of eventResult.data ?? []) targetNames.set(`event:${event.id}`, event.title);

      const withNames = (row: any): FitnessOutdoorEngagementRow => ({
        ...row,
        user_name: [row.user?.first_name, row.user?.last_name].filter(Boolean).join(" ") || "Unknown user",
        target_name: targetNames.get(`${row.target_type}:${row.target_id}`) ?? "Removed Outdoor item",
      });

      const recencyEngagementRows = recencyRows.map(withNames);

      return {
        completions: completionRows.map(withNames),
        ratings: recencyEngagementRows.filter((row) => row.rating != null),
        plannedVisits: recencyEngagementRows.filter((row) => row.will_visit_at && !row.completed_at).length,
        likes: recencyEngagementRows.filter((row) => row.is_liked).length,
        isConfigured: true,
        setupMessage: null,
      };
    },
    staleTime: 30_000,
  });
};

// =============================================================================
// VERIFICATION QUEUE + EVENT PARTICIPANTS + INCENTIVES (Gap Analysis Part F)
// =============================================================================

// Pending Verification Queue — routes awaiting the m-verify-route flow.
export const usePendingOutdoorRoutes = () => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.pendingRoutes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_outdoor_routes")
        .select(`
          *,
          creator:user_profiles!fitness_outdoor_routes_created_by_fkey(first_name, last_name)
        `)
        .eq("verification_status", "pending_review")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []) as TFitnessOutdoorRouteOutput[];
    },
  });
};

export interface VerifyOutdoorRouteInput {
  id: string;
  action: "approve" | "reject";
  routeClass?: "official" | "community";
  fitcoinsReward?: number;
  note?: string;
}

// m-verify-route flow — enforced server route (fitness.edit).
export const useVerifyOutdoorRoute = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, VerifyOutdoorRouteInput>({
    mutationFn: async ({ id, ...fields }) => {
      const res = await fetch(`/api/fitness/outdoor-routes/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update route verification.");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.allRoutes });
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.pendingRoutes });
      toast.success(
        variables.action === "approve"
          ? "Route verified & published"
          : "Route rejected",
      );
    },
    onError: (error) => toast.error(error.message),
  });
};

// Participants modal (m-view-participants).
export const useOutdoorEventRegistrations = (eventId: string | null) => {
  return useQuery({
    queryKey: OUTDOOR_QUERY_KEYS.eventRegistrations(eventId ?? "none"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_outdoor_event_registrations")
        .select(`
          id, user_id, status, registered_at,
          user:user_profiles(first_name, last_name, phone_number)
        `)
        .eq("event_id", eventId!)
        .order("registered_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!eventId,
  });
};

// FitCoins incentive formula (m-route-incentives).
export interface OutdoorIncentives {
  base_fitcoins: number;
  per_km_fitcoins: number;
  verification_bonus: number;
  event_bonus: number;
  notes: string | null;
}

export const useOutdoorIncentives = () => {
  return useQuery<OutdoorIncentives, Error>({
    queryKey: OUTDOOR_QUERY_KEYS.incentives,
    queryFn: async () => {
      const res = await fetch("/api/fitness/outdoor-incentives");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load incentive config.");
      }
      const json = await res.json();
      return json.incentives as OutdoorIncentives;
    },
  });
};

export interface UpdateOutdoorIncentivesInput {
  baseFitcoins: number;
  perKmFitcoins: number;
  verificationBonus: number;
  eventBonus: number;
  notes?: string | null;
}

export const useUpdateOutdoorIncentives = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateOutdoorIncentivesInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/fitness/outdoor-incentives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save incentive config.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUTDOOR_QUERY_KEYS.incentives });
      toast.success("Incentive formula saved");
    },
    onError: (error) => toast.error(error.message),
  });
};
