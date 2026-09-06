import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * DevOps telemetry (Gap Analysis Part U). Read-only live health from our own
 * stack — no infra mutation controls ever ship here (U-D2). devops.view is
 * super_admin-only in ROLE_DEFAULTS, so this route 403s everyone else (U-D1).
 */
export async function GET() {
  const auth = await requireAdminApiUser("devops.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const startedAt = Date.now();
  const admin = getAdminClient();

  const { error: pingError } = await admin
    .from("user_profiles")
    .select("user_id")
    .limit(1);

  const latencyMs = Date.now() - startedAt;

  const [dueCampaigns, failedCampaigns, pendingFlags] = await Promise.all([
    admin
      .from("notification_campaigns")
      .select("id", { count: "exact", head: true })
      .not("scheduled_at", "is", null)
      .is("sent_at", null)
      .is("failed_at", null),
    admin
      .from("notification_campaigns")
      .select("id", { count: "exact", head: true })
      .not("failed_at", "is", null),
    admin
      .from("content_moderation_flags")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  return NextResponse.json({
    supabase: {
      reachable: !pingError,
      latency_ms: latencyMs,
      error: pingError?.message ?? null,
    },
    api: {
      node_env: process.env.NODE_ENV,
      uptime_secs: Math.round(process.uptime()),
    },
    queues: {
      scheduled_campaigns: dueCampaigns.count ?? 0,
      failed_campaigns: failedCampaigns.count ?? 0,
      pending_moderation_flags: pendingFlags.count ?? 0,
    },
    generated_at: new Date().toISOString(),
  });
}
