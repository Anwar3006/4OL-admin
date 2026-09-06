import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { render } from "@react-email/render";
import React from "react";
import { UAParser } from "ua-parser-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { getServerClient } from "@/lib/db/server";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { LoginAlertEmail } from "@/components/emails/login-alert";
import {
  LOGIN_ALERT_COUNTDOWN_SECONDS,
  LOGIN_ALERT_DEDUPE_MINUTES,
} from "@/lib/login-alerts";

function getClientMeta(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ip, userAgent };
}

const HeartbeatSchema = z.object({ sessionToken: z.string().min(1) });
const EndSchema = z.object({ sessionToken: z.string().min(1) });

/** "Chrome 126 on Windows 10" — falls back to the raw UA when parsing is thin. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  try {
    const parsed = UAParser(userAgent);
    const browser = parsed.browser?.name || "Unknown browser";
    const os = parsed.os?.name || "unknown OS";
    return `${browser} on ${os}`;
  } catch {
    return userAgent.slice(0, 120);
  }
}

/**
 * Concurrent-login interception for super admins: if this new session is not
 * the only active one, insert an admin_login_alerts row (fanned out to the
 * owner's other devices via Supabase Realtime) and email the admin at the
 * same moment. Best-effort — telemetry/alerting must never block login.
 */
async function raiseNewDeviceLoginAlert(
  admin: SupabaseClient,
  user: User,
  newSessionToken: string,
  ip: string | null,
  userAgent: string | null,
): Promise<boolean> {
  // Another active session must exist for this to be a concurrent login.
  const { count: otherSessions } = await admin
    .from("admin_sessions")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", user.id)
    .eq("is_active", true)
    .neq("session_token", newSessionToken);
  if (!otherSessions) return false;

  // Dedupe: new tabs in the same browser start a fresh session row per tab
  // (sessionStorage is per-tab). One alert + one email per window is enough.
  const since = new Date(
    Date.now() - LOGIN_ALERT_DEDUPE_MINUTES * 60_000,
  ).toISOString();
  const { count: recentAlerts } = await admin
    .from("admin_login_alerts")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", user.id)
    .gte("created_at", since);
  if (recentAlerts) return false;

  const { data: newRow } = await admin
    .from("admin_sessions")
    .select("id")
    .eq("session_token", newSessionToken)
    .maybeSingle();

  // The new device's access token is what lets "Sign out that device" revoke
  // the session later (auth.admin.signOut). It lives only in the RLS-owner-
  // readable alert row and expires within the hour regardless.
  const supabase = await getServerClient();
  const {
    data: { session: callerSession },
  } = await supabase.auth.getSession();

  const expiresAt = new Date(
    Date.now() + LOGIN_ALERT_COUNTDOWN_SECONDS * 1000,
  ).toISOString();

  const { data: alert, error: insertError } = await admin
    .from("admin_login_alerts")
    .insert({
      admin_id: user.id,
      new_session_id: newRow?.id ?? null,
      new_session_jwt: callerSession?.access_token ?? null,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !alert) {
    console.error("[admin/session] login alert insert failed:", insertError?.message);
    return false;
  }

  // Email fires here — same request as the Realtime fan-out, so the inbox
  // and the modal land at the same moment.
  let emailSent = false;
  try {
    if (isEmailConfigured() && user.email) {
      const html = await render(
        React.createElement(LoginAlertEmail, {
          email: user.email,
          device: describeDevice(userAgent),
          ip: ip || "Unknown",
          countdownSeconds: LOGIN_ALERT_COUNTDOWN_SECONDS,
        }),
      );
      const sent = await sendEmail({
        to: user.email,
        subject: "Security alert: new device signed in to your admin account",
        html,
      });
      // Only claim it was sent if it was. This value reaches the UI.
      emailSent = sent.success;
    }
  } catch (sendError) {
    // The modal still works without the email — never block on delivery.
    console.error("[admin/session] login alert email failed:", sendError);
  }

  await admin
    .from("admin_login_alerts")
    .update({ email_sent: emailSent })
    .eq("id", alert.id);

  return true;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { ip, userAgent } = getClientMeta(req);
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("start_admin_session", {
    p_admin_id: user.id,
    p_ip_address: ip,
    p_user_agent: userAgent,
    p_device_info: null,
  });

  if (error) {
    console.error("[admin/session] start error:", error.message);
    return NextResponse.json({ error: "Failed to start session." }, { status: 500 });
  }

  let loginAlertRaised = false;
  if (auth.role === SUPER_ADMIN_ROLE) {
    try {
      loginAlertRaised = await raiseNewDeviceLoginAlert(
        admin,
        user,
        data.session_token,
        ip,
        userAgent,
      );
    } catch (alertError) {
      console.error("[admin/session] login alert check failed:", alertError);
    }
  }

  return NextResponse.json({ sessionToken: data.session_token, loginAlertRaised });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = HeartbeatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.rpc("admin_session_heartbeat", {
    p_session_token: parsed.data.sessionToken,
  });

  if (error) {
    console.error("[admin/session] heartbeat error:", error.message);
    return NextResponse.json({ error: "Failed to send heartbeat." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = EndSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.rpc("end_admin_session", {
    p_session_token: parsed.data.sessionToken,
    p_reason: "logout",
  });

  if (error) {
    console.error("[admin/session] end error:", error.message);
    return NextResponse.json({ error: "Failed to end session." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
