/**
 * PATCH /api/admin/login-alerts/[id] — resolve a concurrent-login alert.
 *
 * Body: { action: "acknowledge" | "lockout" }
 *
 * acknowledge — mark the alert acknowledged; the new device stays signed in.
 * lockout     — revoke the new device's GoTrue session (auth.admin.signOut
 *               on the JWT captured at alert time kills its refresh token,
 *               so it drops at the next refresh) and end its admin_sessions
 *               telemetry row with reason 'forced'.
 *
 * Only the alert's owner may resolve it, and only while it is pending.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const ResolveSchema = z.object({
  action: z.enum(["acknowledge", "lockout"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const parsed = ResolveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: alert, error: fetchError } = await admin
    .from("admin_login_alerts")
    .select("id, admin_id, status, new_session_id, new_session_jwt")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  if (alert.admin_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (alert.status !== "pending") {
    return NextResponse.json(
      { error: `Alert already resolved (${alert.status}).` },
      { status: 409 },
    );
  }

  let sessionRevoked = false;
  if (parsed.data.action === "lockout") {
    // 1. Kill the GoTrue session itself — signOut(jwt) revokes the refresh
    //    token tied to that access token, so the other device cannot refresh
    //    and drops out within the access token's remaining lifetime.
    if (alert.new_session_jwt) {
      try {
        await admin.auth.admin.signOut(alert.new_session_jwt);
        sessionRevoked = true;
      } catch (signOutError) {
        // Token may have expired already (~1h lifetime) — the session is
        // effectively dead either way; keep going with the telemetry end.
        console.error(
          "[login-alerts] JWT revocation failed:",
          signOutError instanceof Error ? signOutError.message : signOutError,
        );
      }
    }

    // 2. End the telemetry row so Security Center / Online Now reflect it.
    if (alert.new_session_id) {
      const { error: endError } = await admin
        .from("admin_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          ended_reason: "forced",
        })
        .eq("id", alert.new_session_id)
        .eq("admin_id", auth.user.id);
      if (endError) {
        console.error("[login-alerts] session end failed:", endError.message);
      }
    }
  }

  const newStatus = parsed.data.action === "lockout" ? "locked_out" : "acknowledged";
  const { error: updateError } = await admin
    .from("admin_login_alerts")
    .update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit trail, best-effort — same convention as the other admin routes.
  try {
    await admin.rpc("log_admin_activity", {
      p_admin_id: auth.user.id,
      p_action_type: parsed.data.action === "lockout" ? "login_alert_lockout" : "login_alert_acknowledged",
      p_target_table: "admin_login_alerts",
      p_record_id: id,
      p_description:
        parsed.data.action === "lockout"
          ? `Signed out a concurrent device (session revoked: ${sessionRevoked})`
          : "Acknowledged a concurrent device sign-in",
      p_severity: parsed.data.action === "lockout" ? "warning" : "info",
      p_new_data: null,
    });
  } catch {
    // Audit must never break the resolution path.
  }

  return NextResponse.json({ status: newStatus, sessionRevoked });
}
