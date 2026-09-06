import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Map & Footprint hooks (Gap Analysis Part F). Reads go through the enforced
 * /api/map/* server routes; public map layers (route pins, IBP pins) use the
 * client directly since they carry no PII.
 */

export const MAP_QUERY_KEYS = {
  all: ["map"] as const,
  stats: ["map", "stats"] as const,
  coverage: ["map", "coverage"] as const,
  collectors: ["map", "collectors"] as const,
  footprints: ["map", "footprints"] as const,
  routePins: ["map", "outdoor-route-pins"] as const,
  ibpPins: ["map", "ibp-pins"] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MapStats {
  facilities_plotted: number;
  regions_covered: number;
  ibps_on_map: number;
  total_collectors: number;
  active_collectors: number;
  coverage_percent: number;
  covered_districts: number;
  total_districts: number;
  footprint_points: number;
  footprint_points_today: number;
}

export interface CoverageRegionRow {
  region: string;
  region_key: string;
  facilities_registered: number;
  footprint_points: number;
  collectors_assigned: number;
  collectors_active: number;
  districts_covered: number;
  districts_total: number;
  coverage_percent: number;
  status: "Good" | "Moderate" | "Low" | "Critical";
  prioritized: boolean;
}

export interface MapCollector {
  id: string;
  user_id: string;
  assigned_region: string | null;
  gps_status: "active" | "weak" | "inactive";
  notes: string | null;
  created_at: string;
  footprint_points: number;
  last_active: string | null;
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_number: string | null;
    role: string | null;
  } | null;
}

export interface FootprintRow {
  id: number;
  collector_id: string;
  facility_id: string | null;
  region: string | null;
  district: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  gps_accuracy: number | null;
  activity: "registered" | "survey" | "documented";
  notes: string | null;
  created_at: string;
  collector?: { first_name: string | null; last_name: string | null } | null;
  facility?: { facility_name: string | null } | null;
}

export interface OutdoorRoutePin {
  id: string;
  name: string;
  category: string | null;
  difficulty: string | null;
  distance_km: number | null;
  region: string | null;
  area: string | null;
  route_class: "official" | "community";
  rating: number | null;
  start_lat: number;
  start_lng: number;
  pin_source: "start_point" | "bounds_center" | "none";
  has_gps: boolean;
}

export interface IbpPin {
  id: string;
  business_name: string;
  business_category: string;
  region: string;
  district: string;
  latitude: number;
  longitude: number;
}

export const footprintDisplayId = (id: number | string) =>
  `FP-${String(id).padStart(6, "0")}`;

export const collectorDisplayId = (id: number | string) =>
  `COL-${String(id).padStart(3, "0")}`;

// ---------------------------------------------------------------------------
// Read hooks (server routes)
// ---------------------------------------------------------------------------
export const useMapStats = () => {
  return useQuery<MapStats, Error>({
    queryKey: MAP_QUERY_KEYS.stats,
    queryFn: async () => {
      const res = await fetch("/api/map/stats");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load map stats.");
      }
      return res.json();
    },
  });
};

export const useCoverageReport = () => {
  return useQuery<{ regions: CoverageRegionRow[] }, Error>({
    queryKey: MAP_QUERY_KEYS.coverage,
    queryFn: async () => {
      const res = await fetch("/api/map/coverage");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load coverage report.");
      }
      return res.json();
    },
  });
};

export const useMapCollectors = () => {
  return useQuery<{ collectors: MapCollector[] }, Error>({
    queryKey: MAP_QUERY_KEYS.collectors,
    queryFn: async () => {
      const res = await fetch("/api/map/collectors");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load collectors.");
      }
      return res.json();
    },
  });
};

export interface FootprintFilters {
  collector?: string;
  region?: string;
  activity?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const useFootprints = (filters: FootprintFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.collector) params.set("collector", filters.collector);
  if (filters.region) params.set("region", filters.region);
  if (filters.activity) params.set("activity", filters.activity);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 25));

  return useQuery<
    {
      footprints: FootprintRow[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    },
    Error
  >({
    queryKey: [...MAP_QUERY_KEYS.footprints, filters] as const,
    queryFn: async () => {
      const res = await fetch(`/api/map/footprints?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load footprints.");
      }
      return res.json();
    },
  });
};

// ---------------------------------------------------------------------------
// Write hooks (server routes)
// ---------------------------------------------------------------------------
export interface AddCollectorInput {
  userId: string;
  assignedRegion: string | null;
  notes?: string | null;
}

export const useAddCollector = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, AddCollectorInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/map/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add collector.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.collectors });
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.stats });
      toast.success("Collector added");
    },
    onError: (error) => toast.error(error.message),
  });
};

export interface UpdateCollectorInput {
  id: string;
  assignedRegion?: string | null;
  gpsStatus?: "active" | "weak" | "inactive";
  notes?: string | null;
}

export const useUpdateCollector = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, UpdateCollectorInput>({
    mutationFn: async ({ id, ...fields }) => {
      const res = await fetch(`/api/map/collectors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update collector.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.collectors });
      toast.success("Collector updated");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDeleteCollector = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/map/collectors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to remove collector.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.collectors });
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.stats });
      toast.success("Collector removed");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const usePrioritizeRegion = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { region: string; prioritize: boolean }>({
    mutationFn: async (input) => {
      const res = await fetch("/api/map/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to update region priority.");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MAP_QUERY_KEYS.coverage });
      toast.success(
        variables.prioritize ? "Region prioritized" : "Priority removed",
      );
    },
    onError: (error) => toast.error(error.message),
  });
};

// ---------------------------------------------------------------------------
// Public map layers (client-side — no PII)
// ---------------------------------------------------------------------------
export const useOutdoorRoutePins = () => {
  return useQuery<OutdoorRoutePin[], Error>({
    queryKey: MAP_QUERY_KEYS.routePins,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("get_outdoor_route_pins");
      if (error) throw new Error(error.message);
      return (data ?? []) as OutdoorRoutePin[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useIbpPins = () => {
  return useQuery<IbpPin[], Error>({
    queryKey: MAP_QUERY_KEYS.ibpPins,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("ibp")
        .select("id, business_name, business_category, region, district, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data ?? []) as IbpPin[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
