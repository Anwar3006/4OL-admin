import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Anatomy overview KPIs (Gap Analysis Part A Phase 1). Head-counts only —
 * prefers the get_anatomy_overview_stats() RPC and falls back to direct
 * head queries when the anatomy_extension migration isn't applied yet.
 */
export async function GET() {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  const { data: rpcData, error: rpcError } = await admin.rpc(
    "get_anatomy_overview_stats",
  );

  if (!rpcError && rpcData) {
    return NextResponse.json({ stats: rpcData, source: "rpc" });
  }

  // Fallback: head counts (migration not applied).
  const [parts, conditionLinks, symptomLinks] = await Promise.all([
    admin.from("body_parts").select("id", { count: "exact", head: true }),
    admin.from("condition_body_parts").select("id", { count: "exact", head: true }),
    admin.from("symptom_body_parts").select("id", { count: "exact", head: true }),
  ]);

  const error = parts.error || conditionLinks.error || symptomLinks.error;
  if (error) {
    console.error("[anatomy/overview] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load anatomy overview." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    stats: {
      body_parts_mapped: parts.count ?? 0,
      condition_links: conditionLinks.count ?? 0,
      symptom_links: symptomLinks.count ?? 0,
      map_interactions_30d: 0,
      healthy_tip_links: 0,
      hotspots: 0,
    },
    source: "fallback",
  });
}
