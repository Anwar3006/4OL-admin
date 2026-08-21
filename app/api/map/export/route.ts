import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// 📥 Export Map Data (Gap Analysis Part F, decision F-D5 — map.export key).
// Streams the plotted facility pins as CSV.
export async function GET() {
  const auth = await requireAdminApiUser("map.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("facility_profile")
    .select(
      "facility_name, facility_type, region, district, area, latitude, longitude, status, created_at",
    )
    .not("status", "in", '("Rejected","rejected")')
    .order("region")
    .order("district")
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "export_map_data",
    p_target_table: "facility_profile",
    p_description: `Exported ${(data ?? []).length} map facility pins as CSV`,
    p_severity: "warning",
  });

  const headers = [
    "facility_name",
    "facility_type",
    "region",
    "district",
    "area",
    "latitude",
    "longitude",
    "status",
    "created_at",
  ];
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const lines = [
    headers.join(","),
    ...(data ?? []).map((row: Record<string, unknown>) =>
      headers.map((h) => escape(String(row[h] ?? ""))).join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="map-facilities-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
