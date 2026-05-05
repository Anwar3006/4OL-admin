import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

/** PATCH /api/user/ratings — upsert a facility rating */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { facilityId, rating, comment } = body || {};

  if (!facilityId || rating === undefined) {
    return NextResponse.json({ error: "facilityId and rating are required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("facility_ratings").upsert(
    { facility_id: facilityId, user_id: user.id, rating, comment },
    { onConflict: "user_id,facility_id" },
  );

  if (error) {
    console.error("[ratings] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/user/ratings?facilityId=...&userId=... — fetch ratings (public) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId");
  const userId = searchParams.get("userId");

  if (!facilityId) {
    return NextResponse.json({ error: "facilityId is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("facility_ratings")
    .select("*, user_profiles(id, first_name, last_name)")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
