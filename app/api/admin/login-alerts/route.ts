/**
 * GET /api/admin/login-alerts — catch-up endpoint for the LoginAlertGuard.
 *
 * Returns the caller's newest pending, not-yet-expired concurrent-login
 * alert so a device that loads the dashboard after the Realtime INSERT
 * still gets the modal. JWT column is never exposed to the client.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data: alert, error } = await admin
    .from("admin_login_alerts")
    .select("id, ip_address, user_agent, expires_at, created_at")
    .eq("admin_id", auth.user.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: alert ?? null });
}
