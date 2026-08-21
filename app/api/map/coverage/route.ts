import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  allRegionKeys,
  districtKey,
  normalizeRegionKey,
  regionDistrictCount,
  regionLabel,
} from "@/lib/map-coverage";

// Coverage Report (Gap Analysis Part F, phase 4, decision F-D2): districts
// with >=1 active facility vs districts listed in ghana-locations.json.
export async function GET() {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();

  const [facilities, footprints, collectors, priorities] = await Promise.all([
    admin
      .from("facility_profile")
      .select("region, district, status")
      .not("status", "in", '("Rejected","rejected")'),
    admin.from("collector_footprints").select("region, collector_id"),
    admin.from("map_collectors").select("assigned_region, gps_status"),
    admin.from("map_priority_regions").select("region, prioritized_at"),
  ]);

  const priorityRegions = new Set(
    ((priorities.data ?? []) as Array<{ region: string }>).map((p) => p.region),
  );

  const rows = allRegionKeys().map((regionKey) => {
    const facilitiesInRegion = ((facilities.data ?? []) as Array<{
      region: string | null;
      district: string | null;
      status: string | null;
    }>).filter((f) => normalizeRegionKey(f.region) === regionKey);

    const covered = new Set<string>();
    for (const f of facilitiesInRegion) {
      if (f.status?.toLowerCase() !== "active") continue;
      const key = districtKey(regionKey, f.district);
      if (key) covered.add(key);
    }

    const footprintRows = ((footprints.data ?? []) as Array<{
      region: string | null;
      collector_id: string;
    }>).filter((fp) => normalizeRegionKey(fp.region) === regionKey);

    const assignedCollectors = ((collectors.data ?? []) as Array<{
      assigned_region: string | null;
      gps_status: string;
    }>).filter((c) => normalizeRegionKey(c.assigned_region) === regionKey);

    const totalDistricts = regionDistrictCount(regionKey);
    const coveragePercent = totalDistricts
      ? Math.round((covered.size / totalDistricts) * 100)
      : 0;

    const status =
      coveragePercent >= 75
        ? "Good"
        : coveragePercent >= 50
          ? "Moderate"
          : coveragePercent >= 25
            ? "Low"
            : "Critical";

    return {
      region: regionLabel(regionKey),
      region_key: regionKey,
      facilities_registered: facilitiesInRegion.length,
      footprint_points: footprintRows.length,
      collectors_assigned: assignedCollectors.length,
      collectors_active: assignedCollectors.filter((c) => c.gps_status === "active")
        .length,
      districts_covered: covered.size,
      districts_total: totalDistricts,
      coverage_percent: coveragePercent,
      status,
      prioritized: priorityRegions.has(regionKey),
    };
  });

  return NextResponse.json({ regions: rows });
}

// 🔺 Prioritize / unprioritize a region (Collector management write, users.edit).
const PrioritizeSchema = z.object({
  region: z.string().min(1),
  prioritize: z.boolean(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = PrioritizeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const regionKey = normalizeRegionKey(parsed.data.region);
  if (!regionKey) {
    return NextResponse.json({ error: "Unknown region" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  if (parsed.data.prioritize) {
    const { error } = await admin.from("map_priority_regions").upsert(
      { region: regionKey, prioritized_by: user.id, prioritized_at: new Date().toISOString() },
      { onConflict: "region" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("map_priority_regions")
      .delete()
      .eq("region", regionKey);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: parsed.data.prioritize ? "prioritize_region" : "deprioritize_region",
    p_target_table: "map_priority_regions",
    p_record_id: regionKey,
    p_description: `${parsed.data.prioritize ? "Prioritized" : "Removed priority from"} region ${regionLabel(regionKey)}`,
  });

  return NextResponse.json({ success: true });
}
