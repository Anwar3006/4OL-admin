import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * 3D pin anchors for the anatomy explorer (Gap Analysis Part AL, AL-D3).
 * Written by the 3D Pin Placement editor tab; consumed by the mobile app
 * through get_anatomy_region_content().
 */

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const region = req.nextUrl.searchParams.get("region");
  const admin = getAdminClient();

  let query = admin
    .from("anatomy_hotspots_3d")
    .select("*, body_parts(id, name, body_system, gender_scope)")
    .order("display_order")
    .limit(500);
  if (region) query = query.eq("region_key", region);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ hotspots: [], applied: false });
  }
  return NextResponse.json({ hotspots: data ?? [], applied: true });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const body = await req.json().catch(() => null);
  const bodyPartId = typeof body?.body_part_id === "string" ? body.body_part_id : null;
  const regionKey = typeof body?.region_key === "string" ? body.region_key : null;
  const gender = ["female", "male", "shared"].includes(body?.gender)
    ? body.gender
    : "shared";
  const x = Number(body?.x);
  const y = Number(body?.y);
  const z = Number(body?.z);

  if (!bodyPartId || !regionKey || [x, y, z].some((n) => !Number.isFinite(n))) {
    return NextResponse.json(
      { error: "body_part_id, region_key and numeric x/y/z are required." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("anatomy_hotspots_3d")
    .upsert(
      {
        body_part_id: bodyPartId,
        region_key: regionKey,
        gender,
        x,
        y,
        z,
        source: "manual",
      },
      { onConflict: "body_part_id,gender" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("[anatomy/hotspots3d] upsert failed:", error.message);
    return NextResponse.json(
      { error: "Failed to save the 3D pin. Is the Part AL migration applied?" },
      { status: 500 },
    );
  }
  return NextResponse.json({ hotspot: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from("anatomy_hotspots_3d").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to delete the pin." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
