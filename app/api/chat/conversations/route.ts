import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/chat/conversations
 *
 * Fetches the conversation list for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin.rpc("get_conversations", {
      p_user_id: session.user.id,
      p_limit: 10, // Prefetch only the first 10
    });

    if (error) {
      console.error("[chat/conversations] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Conversations: ", JSON.stringify(data, null, 2));

    // Filter out conversations that don't have a leader or admin
    // const filteredData = (data || []).filter((item: any) => {
    //   const conv = item.conversations;
    //   if (!conv) return false;
    //   const members = conv.members || [];
    //   return members.some(
    //     (m: any) => m.role === "group_leader" || m.role === "admin",
    //   );
    // });

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
