import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";

/** GET /api/user/favorites */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("facility_favorites")
    .select("facility_id, facility_profile(*)")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** POST /api/user/favorites — add favorite */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const facilityId = body?.facilityId;
  if (!facilityId) return NextResponse.json({ error: "facilityId is required" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("facility_favorites")
    .insert({ user_id: user.id, facility_id: facilityId });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, note: "already_favorited" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/user/favorites — remove favorite */
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const facilityId = body?.facilityId;
  if (!facilityId) return NextResponse.json({ error: "facilityId is required" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("facility_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("facility_id", facilityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
