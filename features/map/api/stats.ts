import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import {
  districtKey,
  normalizeRegionKey,
  totalDistrictCount,
} from "@/features/map/data/map-coverage";

// Map KPI row (Gap Analysis Part F, phase 1). Read-only rollup behind
// facilities.view; the coverage denominator comes from ghana-locations.json.
export async function GET() {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  const [facilities, ibps, collectors, footprints, footprintsToday] =
    await Promise.all([
      admin
        .from("facility_profile")
        .select("region, district, status")
        .not("status", "in", '("Rejected","rejected")'),
      admin
        .from("ibp")
        .select("id", { count: "exact", head: true })
        .not("latitude", "is", null)
        .not("longitude", "is", null),
      admin.from("map_collectors").select("id, gps_status"),
      admin.from("collector_footprints").select("id", { count: "exact", head: true }),
      admin
        .from("collector_footprints")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

  const facilityRows = (facilities.data ?? []) as Array<{
    region: string | null;
    district: string | null;
    status: string | null;
  }>;

  const regionsWithFacilities = new Set<string>();
  const coveredDistricts = new Set<string>();
  for (const row of facilityRows) {
    const regionKey = normalizeRegionKey(row.region);
    if (regionKey) regionsWithFacilities.add(regionKey);
    if (
      row.status?.toLowerCase() === "active" &&
      districtKey(regionKey, row.district)
    ) {
      coveredDistricts.add(districtKey(regionKey, row.district)!);
    }
  }

  const totalDistricts = totalDistrictCount();
  const collectorRows = (collectors.data ?? []) as Array<{ gps_status: string }>;

  return NextResponse.json({
    facilities_plotted: facilityRows.length,
    regions_covered: regionsWithFacilities.size,
    ibps_on_map: ibps.count ?? 0,
    total_collectors: collectorRows.length,
    active_collectors: collectorRows.filter((c) => c.gps_status === "active").length,
    coverage_percent: totalDistricts
      ? Math.round((coveredDistricts.size / totalDistricts) * 100)
      : 0,
    covered_districts: coveredDistricts.size,
    total_districts: totalDistricts,
    footprint_points: footprints.count ?? 0,
    footprint_points_today: footprintsToday.count ?? 0,
  });
}
