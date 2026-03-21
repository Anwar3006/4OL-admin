import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * PATCH /api/user/push-token
 *
 * Saves the Expo push token for the authenticated user.
 * Called by the mobile app's NotificationContext after registering for push.
 *
 * Body: { expoPushToken: string }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const expoPushToken = body?.expoPushToken;

  if (!expoPushToken || typeof expoPushToken !== "string") {
    return NextResponse.json({ error: "expoPushToken is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_profiles")
    .update({ expo_push_token: expoPushToken })
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[push-token] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
