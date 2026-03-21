import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/user/active
 * 
 * Updates the user's last_active timestamp.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    const { error } = await admin
      .from("user_profiles")
      .update({ last_active: new Date().toISOString() })
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
