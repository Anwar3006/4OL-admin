import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const QuerySchema = z.object({ timeFilter: z.enum(["7", "30", "90", "year"]).default("30") });

/** Preserves the documented /api/facility-metrics contract after consolidation. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const parsed = QuerySchema.safeParse({ timeFilter: request.nextUrl.searchParams.get("timeFilter") || undefined });
  if (!parsed.success) return NextResponse.json({ error: "Invalid facility metrics query", details: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await getAdminClient().rpc("get_facility_dashboard_metrics", { time_filter: parsed.data.timeFilter });
  if (error) return NextResponse.json({ error: "Failed to load facility metrics." }, { status: 500 });
  return NextResponse.json({ metrics: data });
}
