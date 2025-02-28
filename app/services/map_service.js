"use client";
import { supabase } from "../utils/supabaseClient";

export const getMapMarkerDetails = async ({
  region = null,
  district = null,
  isApproved = null,
  facilityType = null,
}) => {
  let query = supabase
    .from("healthcare_profiles")
    .select(
      "id, status, facility_name, latitude, longitude, gps_address, facility_type, creator:user_profiles!healthcare_profiles_created_by_fkey(first_name, last_name), created_at, approved_at"
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  switch (isApproved) {
    case "Approved":
      query = query.eq("status", "Approved");
      break;
    case "Pending":
      query = query.eq("status", "Pending");
      break;
    default:
      break;
  }
  // const isApprovedFilter = isApproved ? "Approved" : "Pending" ;

  // //Apply filters if they exist
  // if (isApproved) {
  //   query = query.eq("status", isApprovedFilter);
  // }

  if (region) {
    query = query.eq("region", region);
  }

  if (district) {
    query = query.eq("district", district);
  }

  if (facilityType) {
    query = query.eq("facility_type", facilityType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching map marker data:", error);
    throw error;
  }

  return data;
};

// You can also export other related functions here
export const getAllRegions = async () => {
  const { data, error } = await supabase
    .from("healthcare_profiles")
    .select("region, district")
    .not("region", "is", null);

  // Group districts by region
  const regionDistrictMap = {};

  // Iterate through data to build the map
  data.forEach((item) => {
    const region = item.region.trim();
    const district = item.district.trim();

    if (region && district) {
      if (!regionDistrictMap[region]) {
        regionDistrictMap[region] = [];
      }

      // Only add the district if it's not already in the array
      if (!regionDistrictMap[region].includes(district)) {
        regionDistrictMap[region].push(district);
      }
    }
  });

  // Sort districts within each region
  Object.keys(regionDistrictMap).forEach((region) => {
    regionDistrictMap[region].sort();
  });

  if (error) {
    console.error("Error fetching regions:", error);
    throw error;
  }

  // Remove duplicates
  return regionDistrictMap;
};

export const getFacilityTypes = async () => {
  const { data, error } = await supabase
    .from("healthcare_profiles")
    .select("facility_type", { count: "exact", head: false });

  if (error) {
    console.error("Error fetching facility types:", error);
    throw error;
  }

  // Extract unique facility types
  const facilityTypesSet = new Set();

  data.forEach((item) => {
    if (item.facility_type) {
      facilityTypesSet.add(item.facility_type.trim());
    }
  });

  // Convert set to sorted array if needed
  const facilityTypes = Array.from(facilityTypesSet).sort();

  return facilityTypes;
};

// Export all functions as a service object
const MapService = {
  getFacilityTypes,
  getMapMarkerDetails,
  getAllRegions,
};

export default MapService;
