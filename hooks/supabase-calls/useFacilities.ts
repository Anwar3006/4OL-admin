import { deleteFiles, moveFile } from "@/actions/media-storage.actions";
import { supabase } from "@/lib/supabase";
import {
  TFacilityProfileInput,
  TFacilityProfileOutput,
} from "@/schemas/facility-profile.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeLocationName } from "@/lib/utils";
import { FACILITY_TYPE_ENUM } from "@/types/formInput";

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

      const query = supabase
        .from("facility_profile")
        .select("*", { count: "exact" });

      // 2. We ALWAYS need stats for the analytics cards
      // Note: We don't filter stats by search/status because cards show GLOBAL totals
      const statsQuery = supabase
        .from("facility_profile")
        .select("status, facility_type", { count: "exact" });

      if (search) {
        query.or(
          `facility_name.ilike.%${search}%,district.ilike.%${search}%,region.ilike.%${search}%`,
        );
      }
      if (status) {
        query.eq("status", status);
      }
      if (type) {
        query.eq("facility_type", type);
        statsQuery.eq("facility_type", type);
      }

      if (includeStatsOnly) {
        const { data: statsData, count: totalCount, error } = await statsQuery; // Must add count option here

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
        query.order("created_at", { ascending: false }).range(from, to),
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
      // 1. Fetch data from RPC as usual
      const { data, error } = await supabase.rpc("get_facilities_map", {
        minlng: minLng,
        minlat: minLat,
        maxlng: maxLng,
        maxlat: maxLat,
        zoom_level: Math.round(zoom),
      });

      if (error) throw error;

      // 2. Client-side filtering for Region, District, Type, Status
      // This is necessary because the RPC might not handle these specific filters yet
      if (data && data.features) {
        let filteredFeatures = data.features;

        if (filters.region) {
          const normRegion = normalizeLocationName(filters.region);
          filteredFeatures = filteredFeatures.filter((f: any) => {
            const featRegion = normalizeLocationName(f.properties.region || f.properties.region_name || "");
            return featRegion.includes(normRegion);
          });
        }

        if (filters.district) {
          const normDistrict = normalizeLocationName(filters.district);
          filteredFeatures = filteredFeatures.filter((f: any) => {
            const featDistrict = normalizeLocationName(f.properties.district || f.properties.district_name || "");
            return featDistrict.includes(normDistrict);
          });
        }

        if (filters.facilityType) {
          filteredFeatures = filteredFeatures.filter((f: any) => {
            const type = f.properties.facility_type?.toLowerCase() || "";
            // If filtering for wellness_center, match anything starting with wellness
            if (filters.facilityType === "wellness_center") {
              return type.startsWith("wellness");
            }
            return type === filters.facilityType?.toLowerCase();
          });
        }

        if (filters.status) {
          filteredFeatures = filteredFeatures.filter((f: any) => 
            f.properties.status === filters.status?.toLowerCase()
          );
        }

        return { ...data, features: filteredFeatures };
      }

      return data;
    },
    enabled: enabled,
    placeholderData: (prev: any) => prev,
    staleTime: 1000 * 60, //Every 1 min
  });
};

//TODO: Test this hook
export const getTopRatedFacilities = async () => {
  return useQuery<TFacilityProfileOutput[], Error>({
    queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_profile")
        .select("*")
        .gte("rating", 4)
        .order("avg_rating", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};


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
        keywords:
          typeof data.keywords === "string"
            ? data.keywords.split(",")
            : data.keywords,
      };

      const { data: facility, error } = await supabase.rpc(
        "register_facility_with_profile",
        {
          p_admin_id: data.adminId,
          p_owner_id: data.ownerId,
          p_first_name: data.first_name,
          p_last_name: data.last_name,
          p_phone_number: data.person_contact_number,
          p_facility_data: { ...payload },
        },
      );

      if (error) {
        console.error("Supabase RPC Error:", error);
        throw new Error(error.message);
      }

      // Save Offerings if any
      if (payload.offerings?.length) {
        const { error: offeringError } = await supabase
          .from("facility_offerings")
          .insert(
            payload.offerings.map((o: any) => ({
              ...o,
              facility_id: facility.id,
            })),
          );
        if (offeringError) console.error("Offerings error:", offeringError);
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
      // Storage Logic: Delete and Move files (Same as your original)
      if (imagesToDelete?.length) await deleteFiles(imagesToDelete);

      const newFilePaths = await Promise.all(
        (newlyUploadedFiles || []).map(async (tempPath: string) => {
          const newPath = `facilities/approved/${id}/${tempPath.split("/").pop()}`;
          await moveFile(tempPath, newPath);
          return newPath;
        }),
      );

      const finalMediaUrls = [
        ...(updatePayload.media_urls || []).filter(
          (url: string) => !imagesToDelete?.includes(url),
        ),
        ...newFilePaths,
      ];

      // RPC Call: Finalize DB + Audit Log
      const { error } = await supabase.rpc("admin_update_facility_profile", {
        p_admin_id: updatePayload.adminId,
        p_facility_id: id,
        p_payload: updatePayload,
        p_final_media_urls: finalMediaUrls,
      });

      if (error) throw error;

      // Update Offerings: Delete and Re-insert
      if (updatePayload.offerings) {
        await supabase.from("facility_offerings").delete().eq("facility_id", id);

        if (updatePayload.offerings.length > 0) {
          const { error: offeringError } = await supabase
            .from("facility_offerings")
            .insert(
              updatePayload.offerings.map((o: any) => ({
                ...o,
                facility_id: id,
              })),
            );
          if (offeringError) console.error("Offerings error:", offeringError);
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
        // Ensure the file is actually moved (it might already be moved via media_urls loop, 
        // but calling it again ensures safety if it's NOT in media_urls for some reason)
        try {
          await moveFile(featured_image_url, finalFeaturedUrl);
        } catch (e) {
          console.log("Featured image move note:", e); // Often fails if already moved, which is fine
        }
      }

      console.log("Approved Image Migration Map:", {
        before: featured_image_url,
        after: finalFeaturedUrl,
        mediaCount: newFilePaths.length,
      });

      // RPC Call
      const { error } = await supabase.rpc("admin_change_facility_status", {
        p_admin_id: adminId,
        payload: {
          p_facility_id: id,
          p_new_status: "active",
          p_media_urls: newFilePaths,
          featured_image_url: finalFeaturedUrl,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility approved!");
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
        // Ensure file move
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
      const { error } = await supabase.rpc("admin_change_facility_status", {
        p_admin_id: adminId,
        payload: {
          p_facility_id: id,
          p_new_status: "rejected",
          p_media_urls: newFilePaths,
          featured_image_url: finalFeaturedUrl, // Passed featured_image_url to rejection RPC as well
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility rejected!");
    },
  });
};

// 3. Delete Facility Hook
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adminId, id }: { adminId: string; id: string }) => {
      const { error } = await supabase.rpc("admin_delete_facility", {
        p_admin_id: adminId,
        p_facility_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACILITY_PROFILE_QUERY_KEYS.all,
      });
      toast.success("Facility deleted.");
    },
  });
};

///// ========== Helper Function
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
