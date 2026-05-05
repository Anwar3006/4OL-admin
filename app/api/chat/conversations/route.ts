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

/**
 * GET /api/chat/conversations
 *
 * Fetches the conversation list for the authenticated user.
 *
 * FIX: Previously used auth.api.getSession() (BetterAuth) which returned null.
 * Also: session.user.id was a BetterAuth text ID, but get_conversations RPC
 * expects a UUID — caused "operator does not exist: uuid = text" 500 error.
 * admin.auth.getUser() returns a real UUID from auth.users.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin.rpc("get_conversations", {
      p_user_id: user.id,   // ← native UUID — no more type mismatch
      p_limit: 50,
    });

    if (error) {
      console.error("[chat/conversations] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
