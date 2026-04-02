import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * GET /api/user/avatar
 *
 * Generates a short-lived signed upload URL so the mobile app can PUT the
 * image bytes directly to Supabase Storage without ever touching the
 * service-role key on the device.
 *
 * Response: { signedUrl: string, path: string }
 *
 * `path`  — the storage-relative key that should be saved to user.image after
 *           the upload completes. Pass it back to PATCH /api/user/avatar.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Build a unique, deterministic-ish path ─────────────────────────────
  // Using the user's ID as a folder keeps all their uploads together and
  // makes the path globally unique. nanoid(8) avoids cache collisions.
  const path = `avatars/${session.user.id}/${nanoid(8)}.jpg`;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    console.error("[avatar] createSignedUploadUrl error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path });
}

/**
 * PATCH /api/user/avatar
 *
 * Saves the storage path returned by the signed-URL step to BetterAuth's
 * `user.image` column. Called by the mobile app after a successful upload.
 *
 * Body: { path: string }  — storage-relative path (e.g. "avatars/uid/abc.jpg")
 *
 * Response: { avatar_url: string } — full public URL ready to display
 */
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.path || typeof body.path !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid `path` field" },
      { status: 400 },
    );
  }

  const { path } = body;

  // Sanity check: only allow paths within the user's own avatars folder to
  // prevent one user from overwriting another's image.
  const expectedPrefix = `avatars/${session.user.id}/`;
  if (!path.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Path does not belong to this user" },
      { status: 403 },
    );
  }

  const admin = getSupabaseAdmin();

  // Update the `image` column in BetterAuth's `user` table (NOT user_profiles)
  const { error } = await admin
    .from("user")
    .update({ image: path })
    .eq("id", session.user.id);

  if (error) {
    console.error("[avatar] update user.image error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the full public URL so the app can update its local state immediately
  const avatar_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({ avatar_url });
}
