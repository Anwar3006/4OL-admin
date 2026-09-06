import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Validates the Bearer token and returns the Supabase user.
 * Used by all routes in this file.
 */
async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

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

  const profile = data
    ? {
        ...data,
        email: user.email ?? null,
        avatar_url: data.avatar_url ?? user.user_metadata?.avatar_url ?? null,
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
