/**
 * GET /api/facilities/options — lightweight facility picker feed.
 * Used by BedTracker's register dialog (Part L Phase 5 interconnection:
 * resolve against facility_profile instead of free-text names).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";

  const admin = getAdminClient();
  let query = admin
    .from("facility_profile")
    .select("id, facility_name, facility_type, area, region, status")
    .order("facility_name", { ascending: true })
    .limit(30);
  if (search) {
    query = query.ilike("facility_name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ options: data ?? [] });
}
