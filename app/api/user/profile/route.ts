import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser } from "@/lib/mobile-auth";

/**
 * The local `getRequestUser` that used to live here called
 * `admin.auth.getUser(token)` — a network round trip to GoTrue on every
 * request, before the query this route actually exists to run.
 *
 * `@/lib/mobile-auth` verifies the JWT signature in-process instead. Same
 * guarantee, no round trip. See that module for the rollover behaviour while
 * legacy HS256 tokens are still in circulation.
 */

/**
 * GET /api/user/profile
 * Returns the authenticated user's full profile.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[user-profile GET] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // user_metadata is Record<string, unknown>, so narrow before use — the old
  // code got `any` from the Supabase user object and never had to.
  const metadataAvatar =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const profile = data
    ? {
        ...data,
        email: user.email ?? null,
        avatar_url: data.avatar_url ?? metadataAvatar,
      }
    : null;

  return NextResponse.json(profile);
}

/**
 * PATCH /api/user/profile
 * Updates the authenticated user's profile fields.
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { user_id: _ignored, avatar_url: _avatar, ...fields } = body;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .update(fields)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[user-profile PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
