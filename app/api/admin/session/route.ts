import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function getClientMeta(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ip, userAgent };
}

const HeartbeatSchema = z.object({ sessionToken: z.string().min(1) });
const EndSchema = z.object({ sessionToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ip, userAgent } = getClientMeta(req);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("start_admin_session", {
    p_admin_id: user.id,
    p_ip_address: ip,
    p_user_agent: userAgent,
    p_device_info: null,
  });

  if (error) {
    console.error("[admin/session] start error:", error.message);
    return NextResponse.json({ error: "Failed to start session." }, { status: 500 });
  }

  return NextResponse.json({ sessionToken: data.session_token });
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = HeartbeatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("admin_session_heartbeat", {
    p_session_token: parsed.data.sessionToken,
  });

  if (error) {
    console.error("[admin/session] heartbeat error:", error.message);
    return NextResponse.json({ error: "Failed to send heartbeat." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = EndSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("end_admin_session", {
    p_session_token: parsed.data.sessionToken,
    p_reason: "logout",
  });

  if (error) {
    console.error("[admin/session] end error:", error.message);
    return NextResponse.json({ error: "Failed to end session." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
