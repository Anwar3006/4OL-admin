import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST   /api/user/favorites  — add a facility to favorites
 * DELETE /api/user/favorites  — remove a facility from favorites
 * GET    /api/user/favorites  — list all favorites for the current user
 *
 * Body for POST/DELETE: { facilityId: string }
 */

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("facility_favorites")
    .select("facility_id, facility_profile(*)")
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[favorites] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const facilityId = body?.facilityId;
  if (!facilityId) {
    return NextResponse.json({ error: "facilityId is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("facility_favorites").insert({
    user_id:     session.user.id,
    facility_id: facilityId,
  });

  if (error) {
    // Ignore unique-constraint violations (already favorited)
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, note: "already_favorited" });
    }
    console.error("[favorites] POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const facilityId = body?.facilityId;
  if (!facilityId) {
    return NextResponse.json({ error: "facilityId is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("facility_favorites")
    .delete()
    .eq("user_id", session.user.id)
    .eq("facility_id", facilityId);

  if (error) {
    console.error("[favorites] DELETE error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
