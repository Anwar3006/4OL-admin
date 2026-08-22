/**
 * GET /api/healthy-living/analytics — Healthy Living Analytics tab data
 * source (Analytics/Carousels build, Phase 1). Thin wrapper over the
 * get_healthy_living_analytics() RPC so RBAC is enforced server-side.
 * Single definition source for every Healthy Living KPI.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("healthyliving.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { data, error } = await getSupabaseAdmin().rpc("get_healthy_living_analytics");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
