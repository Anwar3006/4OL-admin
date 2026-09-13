import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";

import { getRequestUser } from "@/lib/mobile-auth";

/**
 * PATCH /api/user/push-token
 *
 * Saves the Expo push token for the authenticated user.
 * Called by the mobile app's NotificationContext after registering for push.
 *
 * Validates the caller via Supabase Auth JWT (Bearer token in Authorization
 * header) — compatible with the native Supabase Auth session on mobile.
 *
 * Body: { expoPushToken: string }
 */
export async function PATCH(req: NextRequest) {
  // Verifies the native session JWT's signature in-process — see
  // @/lib/mobile-auth. No round trip to GoTrue.
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const body = await req.json().catch(() => null);
  const expoPushToken = body?.expoPushToken;

  if (!expoPushToken || typeof expoPushToken !== "string") {
    return NextResponse.json({ error: "expoPushToken is required" }, { status: 400 });
  }

  const { error } = await admin
    .from("user_profiles")
    .update({ expo_push_token: expoPushToken })
    .eq("user_id", user.id);

  if (error) {
    console.error("[push-token] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
