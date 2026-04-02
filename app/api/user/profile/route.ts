import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/profile
 *
 * Fetches the authenticated user's profile.
 * Joins the BetterAuth `user` table to pull `email` and `image` (avatar).
 * The `image` column is returned as `avatar_url` so the mobile app's
 * MobileUserProfile type matches without any transformation.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_profiles")
    // Pull email AND image from the linked BetterAuth user row
    .select("*, user:user(email, image)")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[user-profile] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten: expose email and image (as avatar_url) at the top level
  const profile = data
    ? {
        ...data,
        email: data.user?.email ?? null,
        // avatar_url maps to user.image so existing mobile code works
        // without any changes to MobileUserProfile or display components
        avatar_url: data.user?.image ?? null,
        user: undefined, // don't leak the raw join object
      }
    : null;

  return NextResponse.json(profile);
}

/**
 * PATCH /api/user/profile
 *
 * Updates the authenticated user's profile fields (user_profiles table only).
 * For avatar updates use PATCH /api/user/avatar.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Strip fields that must never be updated via this endpoint
  const { user_id: _ignored, avatar_url: _avatar, ...fields } = body;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_profiles")
    .update(fields)
    .eq("user_id", session.user.id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[user-profile] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
