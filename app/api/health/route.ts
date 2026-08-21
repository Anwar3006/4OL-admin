import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getPlatformHealth } from "@/lib/service-health";

/**
 * Service/env-configuration map. Previously unguarded — any visitor could
 * read which integrations are configured (Gap Analysis Part Y-D2). Now
 * requires schematic.view, which is super_admin-only in ROLE_DEFAULTS.
 * Probe logic lives in lib/service-health.ts, shared with /api/admin/schematic.
 */
export async function GET() {
  const auth = await requireAdminApiUser("schematic.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const health = await getPlatformHealth();
    return NextResponse.json(health, {
      status: health.status === "healthy" ? 200 : 503,
    });
  } catch (err) {
    console.error("[health] Unexpected error:", err);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      },
      { status: 503 },
    );
  }
}
