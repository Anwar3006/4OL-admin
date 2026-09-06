/**
 * GET /api/symptoms/analytics — Symptoms Analytics tab data source
 * (Analytics/Carousels build, Phase 1). Thin wrapper over the
 * get_symptom_analytics() RPC so RBAC is enforced server-side.
 * Single definition source for every Symptoms KPI (totals, views,
 * verification rate, body-part distribution, leaderboards).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("symptoms.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { data, error } = await getAdminClient().rpc("get_symptom_analytics");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
