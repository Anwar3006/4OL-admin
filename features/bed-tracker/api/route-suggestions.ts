/**
 * GET /api/bedtracker/route-suggestions?gps=&ward_type=&limit=
 * Gap Analysis Part L (L-D3): deterministic nearest-available routing —
 * haversine over tracked facilities with capacity for the requested ward
 * type. Labelled "AI" in the mockup; there is no ML here.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const WARD_TYPES = [
  "general",
  "icu",
  "surgical",
  "medical",
  "maternity",
  "pediatric",
  "psychiatric",
  "geriatric",
];

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("bedtracker.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const gps = searchParams.get("gps") ?? "";
  const wardType = searchParams.get("ward_type") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 3) || 3, 10);

  if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(gps)) {
    return NextResponse.json(
      { error: 'Provide gps as "lat,lng"' },
      { status: 400 },
    );
  }
  if (!WARD_TYPES.includes(wardType)) {
    return NextResponse.json({ error: "Invalid ward_type" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_bedtracker_route_suggestions", {
    p_pickup_gps: gps,
    p_ward_type: wardType,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suggestions: data ?? [] });
}
