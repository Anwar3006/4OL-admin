import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/user/activity-logs
 *
 * Inserts an activity log for the authenticated user.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { type, description, reference, referenceId, ip } = body || {};

  if (!type || !description) {
    return NextResponse.json({ error: "type and description are required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("activity_logs").insert({
    user_id: session.user.id,
    user_name: session.user.name || session.user.email,
    type,
    description,
    reference,
    reference_id: referenceId,
    ip,
    device_info: null,
    is_created_by_admin_panel: false,
    created_by: session.user.id,
    updated_by: session.user.id,
  });

  if (error) {
    console.error("[activity-logs] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const admin = getSupabaseAdmin();
  let query = admin
    .from("activity_logs")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;

  if (error) {
    console.error("[activity-logs] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
