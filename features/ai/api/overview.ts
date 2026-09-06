import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * AI Hub KPI overview (Gap Analysis Part O).
 * One round-trip via get_ai_hub_overview(): active model count (registry),
 * pending moderation flags, average registry accuracy, queries today.
 */
export async function GET() {
  const auth = await requireAdminApiUser("ai.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_ai_hub_overview");

  if (error) {
    // Migration not yet applied — degrade to an honest empty shape instead
    // of a 500 so the page still renders its tabs.
    console.error("[ai/overview] Supabase error:", error.message);
    return NextResponse.json({
      configured: false,
      activeModels: 0,
      pendingFlags: 0,
      avgAccuracy: null,
      queriesToday: 0,
    });
  }

  return NextResponse.json({
    configured: true,
    activeModels: data.active_models ?? 0,
    pendingFlags: data.pending_flags ?? 0,
    avgAccuracy: data.avg_accuracy ?? null,
    queriesToday: data.queries_today ?? 0,
  });
}
