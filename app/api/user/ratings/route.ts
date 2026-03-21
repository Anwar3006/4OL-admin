import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * PATCH /api/user/ratings
 *
 * Upserts a facility rating for the authenticated user.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { facilityId, rating, comment } = body || {};

  if (!facilityId || rating === undefined) {
    return NextResponse.json({ error: "facilityId and rating are required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("facility_ratings")
    .upsert(
      {
        facility_id: facilityId,
        user_id: session.user.id,
        rating,
        comment,
      },
      { onConflict: "user_id,facility_id" }
    );

  if (error) {
    console.error("[ratings] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
