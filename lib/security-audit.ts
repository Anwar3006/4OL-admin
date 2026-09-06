/**
 * Server-side security audit helpers (Gap Analysis Part AK).
 *
 * Backend half of L4 (attribution) and L5 (enforcement):
 *   - auditAdminRead(): every data-bearing /api/admin GET records one row in
 *     admin_read_audit; when a caller's trailing-hour volume crosses the
 *     anomaly threshold a bot_signals 'read_anomaly' row is raised (the
 *     "AI agent paging through every module" signature).
 *   - issueCanaryFor(): per-admin decoy tokens embedded in API payloads and
 *     the dashboard DOM (components/security/SecurityCanary.tsx). A token
 *     resurfacing in a leak attributes it to the exact session.
 *
 * Both run through the service-role client with explicit admin ids (API
 * routes already resolved the caller via requireAdminApiUser) and are fully
 * fail-open — security telemetry must never fail a request.
 */

import { getAdminClient } from "@/lib/db/admin";

/** Reads per trailing hour beyond which a session is flagged. Mirrors
 *  READ_ANOMALY_THRESHOLD in 20260822_anti_screen_reading_ak.sql. */
const READ_ANOMALY_THRESHOLD = 200;

/**
 * Record an admin data read and return whether the session is anomalous.
 * Never throws; returns false on any failure.
 */
export async function auditAdminRead(
  adminId: string,
  routeKey: string,
  rowCount = 0,
  detail: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const admin = getAdminClient();
    const { error } = await admin.from("admin_read_audit").insert({
      admin_id: adminId,
      route_key: routeKey,
      row_count: Math.max(0, rowCount),
      detail,
    });
    if (error) return false;

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("admin_read_audit")
      .select("*", { count: "exact", head: true })
      .eq("admin_id", adminId)
      .gt("created_at", hourAgo);
    if (countError) return false;

    const anomalous = (count ?? 0) > READ_ANOMALY_THRESHOLD;
    if (anomalous) {
      await admin.from("bot_signals").insert({
        admin_id: adminId,
        kind: "read_anomaly",
        detail: {
          route_key: routeKey,
          reads_last_hour: count,
          threshold: READ_ANOMALY_THRESHOLD,
          source: "server",
        },
      });
    }
    return anomalous;
  } catch {
    return false;
  }
}

/**
 * Issue (or reuse) the freshest un-hit canary token for an admin + context.
 * Returns null when the migration hasn't been applied yet — callers embed
 * nothing rather than failing.
 */
export async function issueCanaryFor(
  adminId: string,
  context: string,
): Promise<string | null> {
  try {
    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("security_canaries")
      .select("token")
      .eq("owner_id", adminId)
      .eq("context", context)
      .is("hit_at", null)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.token) return existing.token;

    // crypto.randomUUID gives 128 random bits as hex-ish text without
    // pulling in pg crypto from the service layer.
    const token = crypto.randomUUID().replace(/-/g, "");
    const { error } = await admin.from("security_canaries").insert({
      owner_id: adminId,
      context,
      token,
    });
    if (error) return null;
    return token;
  } catch {
    return null;
  }
}
