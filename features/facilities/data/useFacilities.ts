import { deleteFiles, moveFile } from "@/actions/media-storage.actions";
import { getBrowserClient } from "@/lib/db/browser";
import {
  TFacilityProfileInput,
  TFacilityProfileOutput,
} from "@/features/facilities/schema/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeLocationName } from "@/lib/utils";
import { FACILITY_TYPE_ENUM } from "@/types/formInput";
import {
  adminChangeFacilityStatus,
  adminDeleteFacilityAction,
  adminDeleteFacilityOfferings,
  adminInsertFacilityOfferings,
  adminRegisterFacilityWithProfile,
  adminUpdateFacilityProfile,
} from "@/actions/facility-admin.actions";

const PROVIDER_MEDIA_BUCKET = "provider-media";
const PROVIDER_FOLDER_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

const providerMediaObjectPath = (value: string): string | null => {
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return PROVIDER_FOLDER_PATH.test(value) || value.startsWith("pending/")
      ? value
      : null;
  }
  const marker = "/storage/v1/object/public/provider-media/";
  const index = value.indexOf(marker);
  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : null;
};

const toProviderMediaUrl = (value: string): string => {
  const objectPath = providerMediaObjectPath(value);
  if (!objectPath || value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PROVIDER_MEDIA_BUCKET}/${objectPath}`;
};

interface PaginatedResponse {
  data: TFacilityProfileInput[];
  meta: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  analytics: {
    active: number;
    inactive: number;
    pending: number;
    rejected: number;
  };
}

type Pagination = {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  type?: string;
  includeStatsOnly: boolean;
};

export const FACILITY_PROFILE_QUERY_KEYS = {
  all: ["facilities"] as const,
  map: ["map"] as const,
  lists: () => [...FACILITY_PROFILE_QUERY_KEYS.all, "lists"] as const,
  list: (params: Pagination) =>
    [...FACILITY_PROFILE_QUERY_KEYS.lists(), { ...params }] as const,
  details: () => [...FACILITY_PROFILE_QUERY_KEYS.all, "details"] as const,
  detail: (id: string) =>
    [...FACILITY_PROFILE_QUERY_KEYS.details(), id] as const,
};

//=========== Query Hooks ========

export const useFacilityProfiles = (params: Pagination) => {
  return useQuery<any, Error>({
    queryKey: FACILITY_PROFILE_QUERY_KEYS.list(params),
    queryFn: async () => {
      const { limit, page, search, status, type, includeStatsOnly } = params;
      const from = ((page || 1) - 1) * (limit || 10);
      const to = from + (limit || 10) - 1;

      const supabase = await getBrowserClient();
      const query = supabase
        .from("facility_profile")
        .select("*", { count: "exact" });

      // We ALWAYS need stats for the analytics cards.
      // Note: We don't filter stats by search/status because cards show GLOBAL totals.
      const statsQuery = supabase
        .from("facility_profile")
        .select("status, facility_type", { count: "exact" });

      if (search) {
        query.or(
          `facility_name.ilike.%${search}%,district.ilike.%${search}%,region.ilike.%${search}%`,
        );
      }
      if (status) {
        if (status === "top_rated") {
          query.eq("is_top_rated", true);
        } else if (status === "featured") {
          query.eq("is_featured", true);
        } else {
          query.eq("status", status);
        }
      }
      if (type) {
        // "wellness_center" is a consolidated display label for all wellness/* variants
        // in the DB (e.g. wellness_spa, wellness_gym, wellness_center, etc.).
        // Use a prefix filter so we match every row that starts with "wellness".
        if (type === "wellness_center") {
          query.ilike("facility_type", "wellness%");
          statsQuery.ilike("facility_type", "wellness%");
        } else {
          query.eq("facility_type", type);
          statsQuery.eq("facility_type", type);
        }
      }

      if (includeStatsOnly) {
        const { data: statsData, count: totalCount, error } = await statsQuery;

        if (error) throw error;

        return {
          meta: {
            total: totalCount || 0,
            totalPages: Math.ceil((totalCount || 0) / (limit || 10)),
            currentPage: page,
          },
          analytics: aggregateStats(statsData),
          typeCounts: aggregateTypeCounts(statsData),
          totalRegistered: statsData?.length || 0,
        };
      }

      const [facilitiesResponse, statsResponse] = await Promise.all([
        query.order("facility_name", { ascending: true }).range(from, to),
        statsQuery,
      ]);

      if (facilitiesResponse.error) throw facilitiesResponse.error;
      if (statsResponse.error) throw statsResponse.error;

      const totalCount = facilitiesResponse.count ?? 0;

      return {
        facilities: facilitiesResponse.data,
        meta: {
          total: totalCount,
          totalPages: Math.ceil(totalCount / (limit || 10)),
          currentPage: page,
          totalCount,
        },
        analytics: aggregateStats(statsResponse.data),
        typeCounts: aggregateTypeCounts(statsResponse.data),
        totalRegistered: statsResponse.data?.length || 0,
        avgRating: statsResponse.data?.length
          ? (statsResponse.data.reduce((acc: number, s: any) => acc + (s.rating_average || 0), 0) / statsResponse.data.length).toFixed(1)
          : "0.0",
        topRatedCount: statsResponse.data?.filter((s: any) => s.is_top_rated).length || 0,
      };
    },
  });
};

export const useFacilityProfile = ({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) => {
  return useQuery({
    queryKey: FACILITY_PROFILE_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const result = await supabase
        .from("facility_profile")
        .select("*")
        .eq("id", id);
      if (result.error) throw result.error;
      return result.data[0] as TFacilityProfileOutput;
    },
    enabled: enabled,
  });
};

export const useGetFacilitiesMapData = ({
  minLng,
  minLat,
  maxLng,
  maxLat,
  zoom,
  enabled,
  filters = {},
}: {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
  enabled: boolean;
  filters?: {
    facilityName?: string;
    region?: string;
    district?: string;
    facilityType?: string;
    status?: string;
  };
}) => {
  return useQuery<any, Error>({
    queryKey: [
      FACILITY_PROFILE_QUERY_KEYS.map,
      minLng,
      minLat,
      maxLng,
      maxLat,
      Math.round(zoom),
      filters,
    ],
    queryFn: async () => {
      console.log("Filters: ", filters);
      const supabase = await getBrowserClient();
      const normalizedFilters = {
        ...filters,
        region: filters.region
          ? normalizeLocationName(filters.region)
          : null,
        // district: filters.district
        //   ? normalizeLocationName(filters.district)
        //   : null,
      };
      console.log("Normalized Filters: ", normalizedFilters);
      const { data, error } = await supabase.rpc("get_facilities_map", {
        minlng: minLng,
        minlat: minLat,
        maxlng: maxLng,
        maxlat: maxLat,
        zoom_level: Math.round(zoom),
        // Server-side filters — the updated RPC accepts these as optional params
        p_facility_name: normalizedFilters.facilityName  || null,
        p_region:        normalizedFilters.region        || null,
        p_district:      normalizedFilters.district      || null,
        p_facility_type: normalizedFilters.facilityType  || null,
        p_status:        normalizedFilters.status        || "active",
      });

      if (error) throw error;
      return data;
    },
    enabled: enabled,
    placeholderData: (prev: any) => prev,
    staleTime: 1000 * 60, //Every 1 min
  });
};

type FeaturedTopRatedParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export const FEATURED_QUERY_KEYS = {
  all: ["featured-facilities"] as const,
  lists: () => [...FEATURED_QUERY_KEYS.all, "list"] as const,
  list: (params: FeaturedTopRatedParams) =>
    [...FEATURED_QUERY_KEYS.lists(), { ...params }] as const,
};

export const TOP_RATED_QUERY_KEYS = {
  all: ["top-rated-facilities"] as const,
  lists: () => [...TOP_RATED_QUERY_KEYS.all, "list"] as const,
  list: (params: FeaturedTopRatedParams) =>
    [...TOP_RATED_QUERY_KEYS.lists(), { ...params }] as const,
};

export const useFeaturedFacilities = (params: FeaturedTopRatedParams) => {
  const { page = 1, limit = 10, search } = params;
  return useQuery<any, Error>({
    queryKey: FEATURED_QUERY_KEYS.list(params),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getBrowserClient();
      let query = supabase
        .from("facility_profile")
        .select("*", { count: "exact" })
        .eq("is_featured", true);

      if (search) {
        query = query.or(
          `facility_name.ilike.%${search}%,region.ilike.%${search}%`,
        );
      }

      const { data, count, error } = await query
        .order("facility_name", { ascending: true })
        .range(from, to);

      if (error) throw error;
      const total = count ?? 0;
      return {
        facilities: data,
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

export const useTopRatedFacilities = (params: FeaturedTopRatedParams) => {
  const { page = 1, limit = 10, search } = params;
  return useQuery<any, Error>({
    queryKey: TOP_RATED_QUERY_KEYS.list(params),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getBrowserClient();
      let query = supabase
        .from("facility_profile")
        .select("*", { count: "exact" })
        .eq("is_top_rated", true);

      if (search) {
        query = query.or(
          `facility_name.ilike.%${search}%,region.ilike.%${search}%`,
        );
      }

      const { data, count, error } = await query
        .order("facility_name", { ascending: true })
        .range(from, to);

      if (error) throw error;
      const total = count ?? 0;
      return {
        facilities: data,
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    },
  });
};

// NOTE: useToggleFacilityFeatured / useToggleFacilityTopRated were retired
// in Gap Analysis Part H (H-Phase 3). Client-side writes bypassed server
// RBAC; the supported path is the route-backed useSetFeaturedApi /
// useSetTopRatedApi / useRemoveTopRatedApi in useFacilitiesApi.ts.


//=================== Mutation Hooks ================
export const useCreateFacilityProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: TFacilityProfileInput & {
        featured_image_url: string;
        adminId: string;
      },
    ) => {
      const payload = {
        ...data,
      };

      const facility = await adminRegisterFacilityWithProfile({
        p_admin_id: data.adminId,
        p_owner_id: data.ownerId,
        p_first_name: data.first_name,
        p_last_name: data.last_name,
        p_phone_number: data.person_contact_number,
        p_facility_data: { ...payload },
      });

      // Save Offerings if any
      if (payload.offerings?.length) {
        try {
          await adminInsertFacilityOfferings(
            payload.offerings.map((o: any) => ({
              ...o,
              facility_id: facility.id,
            }))
          );
        } catch (offeringError) {
          console.error("Offerings error:", offeringError);
        }
      }

      return facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility profile created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create facility profile: ${error.message}`);
    },
  });
};

// 1. Update Facility Hook
export const useUpdateFacilityProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      imagesToDelete,
      newlyUploadedFiles,
      ...updatePayload
    }: any) => {
      // New registrar captures are uploaded directly under
      // provider-media/<provider-id>/registrar. Do not move them through the
      // old bucket; the business app uses the same provider root for its own
      // photos.
      const deletedProviderPaths = (imagesToDelete || [])
        .map(providerMediaObjectPath)
        .filter((path: string | null): path is string => path !== null);
      const deletedLegacyPaths = (imagesToDelete || []).filter(
        (path: string) => providerMediaObjectPath(path) === null,
      );
      await Promise.all([
        deletedProviderPaths.length > 0
          ? deleteFiles(deletedProviderPaths, PROVIDER_MEDIA_BUCKET)
          : Promise.resolve(),
        deletedLegacyPaths.length > 0
          ? deleteFiles(deletedLegacyPaths)
          : Promise.resolve(),
      ]);

      const newFilePaths = (newlyUploadedFiles || []).map(toProviderMediaUrl);

      const finalMediaUrls = [
        ...(updatePayload.media_urls || []).filter(
          (url: string) => !imagesToDelete?.includes(url),
        ),
        ...newFilePaths,
      ];

      // RPC Call: Finalize DB + Audit Log
      const featuredImageUrl = updatePayload.featured_image_url
        ? toProviderMediaUrl(updatePayload.featured_image_url)
        : finalMediaUrls[0] ?? null;
      await adminUpdateFacilityProfile({
        p_admin_id: updatePayload.adminId,
        p_facility_id: id,
        p_payload: { ...updatePayload, featured_image_url: featuredImageUrl },
        p_final_media_urls: finalMediaUrls,
      });

      // Update Offerings: Delete and Re-insert
      if (updatePayload.offerings) {
        await adminDeleteFacilityOfferings(id);

        if (updatePayload.offerings.length > 0) {
          try {
            await adminInsertFacilityOfferings(
              updatePayload.offerings.map((o: any) => ({
                ...o,
                facility_id: id,
              }))
            );
          } catch (offeringError) {
            console.error("Offerings error:", offeringError);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility updated and logged.");
    },
  });
};

// 2. Approve Facility Hook
export const useApproveFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      id,
      media_urls,
      featured_image_url,
    }: {
      adminId: string;
      id: string;
      media_urls: string[];
      featured_image_url: string;
    }) => {
      // Storage Logic: Migrate temporary files to permanent
      const newFilePaths = await Promise.all(
        media_urls.map(async (url: string) => {
          if (!url.includes("temporary")) return url;
          const newPath = `facilities/approved/${id}/${url.split("/").at(-1)}`;
          await moveFile(url, newPath);
          return newPath;
        }),
      );

      // Fix stale featured_image_url by mapping it to its new location
      let finalFeaturedUrl = featured_image_url;
      if (featured_image_url?.includes("temporary")) {
        finalFeaturedUrl = `facilities/approved/${id}/${featured_image_url.split("/").at(-1)}`;
        try {
          await moveFile(featured_image_url, finalFeaturedUrl);
        } catch (e) {
          console.log("Featured image move note:", e);
        }
      }

      console.log("Approved Image Migration Map:", {
        before: featured_image_url,
        after: finalFeaturedUrl,
        mediaCount: newFilePaths.length,
      });

      // RPC Call
      await adminChangeFacilityStatus({
        p_admin_id: adminId,
        payload: {
          p_facility_id: id,
          p_new_status: "active",
          p_media_urls: newFilePaths,
          featured_image_url: finalFeaturedUrl,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility approved!");
    },
    onError: (error: any) => {
      toast.error("Failed to approve facility: " + error.message);
    },
  });
};

export const useRejectFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      id,
      media_urls,
      featured_image_url,
    }: {
      adminId: string;
      id: string;
      media_urls: string[];
      featured_image_url: string;
    }) => {
      // Storage Logic: Migrate temporary files to permanent
      const newFilePaths = await Promise.all(
        media_urls.map(async (url: string) => {
          if (!url.includes("temporary")) return url;
          const newPath = `facilities/rejected/${id}/${url.split("/").at(-1)}`;
          await moveFile(url, newPath);
          return newPath;
        }),
      );

      // Fix stale featured_image_url by mapping it to its new location
      let finalFeaturedUrl = featured_image_url;
      if (featured_image_url?.includes("temporary")) {
        finalFeaturedUrl = `facilities/rejected/${id}/${featured_image_url.split("/").at(-1)}`;
        try {
          await moveFile(featured_image_url, finalFeaturedUrl);
        } catch (e) {
          console.log("Featured image move (reject) note:", e);
        }
      }

      console.log("Rejected Image Migration Map:", {
        before: featured_image_url,
        after: finalFeaturedUrl,
        mediaCount: newFilePaths.length,
      });

      // RPC Call
      await adminChangeFacilityStatus({
        p_admin_id: adminId,
        payload: {
          p_facility_id: id,
          p_new_status: "rejected",
          p_media_urls: newFilePaths,
          featured_image_url: finalFeaturedUrl,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility rejected!");
    },
    onError: (error: any) => {
      toast.error("Failed to reject facility: " + error.message);
    },
  });
};

// 3. Delete Facility Hook
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adminId, id }: { adminId: string; id: string }) => {
      await adminDeleteFacilityAction({
        p_admin_id: adminId,
        p_facility_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility deleted.");
    },
  });
};

///// ========== Helper Functions
const aggregateStats = (rawStats: any[] | null) => {
  if (!rawStats) return { active: 0, inactive: 0, pending: 0, rejected: 0 };
  return {
    active: rawStats.filter((s) => s.status === "active").length,
    inactive: rawStats.filter((s) => s.status === "inactive").length,
    pending: rawStats.filter((s) => s.status === "pending").length,
    rejected: rawStats.filter((s) => s.status === "rejected").length,
  };
};

const aggregateTypeCounts = (rawStats: any[] | null) => {
  // Initialize counts for all known types to 0
  const counts: Record<string, number> = {};
  FACILITY_TYPE_ENUM.forEach((type) => {
    counts[type] = 0;
  });

  if (!rawStats) return counts;

  return rawStats.reduce((acc, item) => {
    let type = item?.facility_type?.trim().toLowerCase();

    // Consolidate wellness-related categories using prefix
    if (type && type.startsWith("wellness")) {
      type = "wellness_center";
    }

    if (!type || !FACILITY_TYPE_ENUM.includes(type as any)) return acc;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, counts);
};
