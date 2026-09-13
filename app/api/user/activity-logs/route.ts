import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";

/** POST /api/user/activity-logs — insert a log entry */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { type, description, reference, referenceId, ip } = body || {};

  if (!type || !description) {
    return NextResponse.json({ error: "type and description are required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from("activity_logs").insert({
    user_id: user.id,
    user_name: user.email,
    type,
    description,
    reference,
    reference_id: referenceId,
    ip,
    device_info: null,
    is_created_by_admin_panel: false,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error("[activity-logs] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/user/activity-logs?startDate=...&endDate=... */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const admin = getAdminClient();
  let query = admin
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
