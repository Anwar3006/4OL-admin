import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

/**
 * GET /api/user/avatar
 * Generates a signed upload URL for the mobile app to PUT directly to storage.
 * Response: { signedUrl: string, path: string }
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = `avatars/${user.id}/${nanoid(8)}.jpg`;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    console.error("[avatar GET] createSignedUploadUrl error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path });
}

/**
 * PATCH /api/user/avatar
 * Saves the storage path to user_profiles.avatar_url after a successful upload.
 * Body: { path: string }
 * Response: { avatar_url: string }
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.path || typeof body.path !== "string") {
    return NextResponse.json({ error: "Missing or invalid `path` field" }, { status: 400 });
  }

  const { path } = body;

  // Security: only allow paths scoped to this user's folder
  if (!path.startsWith(`avatars/${user.id}/`)) {
    return NextResponse.json({ error: "Path does not belong to this user" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const avatar_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  // Store avatar_url in user_profiles (no longer depends on the BetterAuth user table)
  const { error } = await admin
    .from("user_profiles")
    .update({ avatar_url })
    .eq("user_id", user.id);

  if (error) {
    console.error("[avatar PATCH] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url });
}
