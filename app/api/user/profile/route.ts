import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/profile
 *
 * Fetches the authenticated user's profile.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_profiles")
    .select("*, user:user(email)")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[user-profile] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the user email for consistency with the expected frontend structure
  const profile = data ? { ...data, email: data.user?.email, user: null } : null;

  return NextResponse.json(profile);
}

/**
 * PATCH /api/user/profile
 *
 * Updates the authenticated user's profile fields.
 *
 * Body: Partial user_profiles row — all fields optional except user_id
 *       is ignored (derived from the session instead).
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

  // Strip user_id from the body — always use the session value so a caller
  // can never update a different user's profile by injecting a different id.
  const { user_id: _ignored, ...fields } = body;

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
