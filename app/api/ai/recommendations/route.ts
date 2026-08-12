import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    recommendations: [],
    total: 0,
    source: "not_configured",
    message:
      "No cross-module AI recommendation pipeline is configured yet. Add ai_usage_logs/ai_recommendations per Epic 29 before surfacing generated recommendations.",
  });
}
