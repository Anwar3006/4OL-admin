/**
 * POST /api/admin/profile/password — change own admin password.
 *
 * Gap Analysis Part W (W-D4): verifies the CURRENT password before
 * rotating, unlike the previous updateUserById-style flows. Verification
 * uses GoTrue's verifyPassword endpoint against the caller's own session;
 * rotation then happens via the admin API so the live JWT session
 * survives the change.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { getServerClient } from "@/lib/db/server";

const SCHEMA = z.object({
  current_password: z.string().min(1),
  new_password: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "New password must contain an uppercase letter")
    .regex(/[a-z]/, "New password must contain a lowercase letter")
    .regex(/\d/, "New password must contain a digit"),
});

export async function POST(request: Request) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  // 1. Verify the current password against the caller's own session via
  //    GoTrue's /verify_password endpoint (the installed gotrue-js build
  //    predates auth.verifyPassword(); signInWithPassword on the
  //    service-role key is rejected by GoTrue).
  const supabase = await getServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "No active session" }, { status: 401 });
  }
  const verifyRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify_password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ password: parsed.data.current_password }),
      cache: "no-store",
    },
  );
  if (!verifyRes.ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  // 2. Rotate via the admin API (keeps the active JWT session valid).
  const { error: updateError } = await admin.auth.admin.updateUserById(auth.user.id, {
    password: parsed.data.new_password,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "password_change",
    p_target_table: "auth_users",
    p_record_id: auth.user.id,
    p_description: "Changed own admin password",
    p_severity: "warning",
  });

  return NextResponse.json({ ok: true });
}
