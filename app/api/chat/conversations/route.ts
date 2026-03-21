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

    const { data, error } = await admin
      .from("conversation_members")
      .select(
        `
        unread_count,
        is_archived,
        conversations!conversation_id (
          id,
          type,
          name,
          avatar_url,
          last_message_at,
          last_message_preview,
          members:conversation_members (
            user_id,
            role,
            user_profiles:user_id (
              first_name,
              last_name
            )
          )
        )
      `,
      )
      .eq("user_id", session.user.id)
      .is("left_at", null)
      .eq("is_archived", false)
      .order("last_message_at", {
        referencedTable: "conversations",
        ascending: false,
      });

    if (error) {
      console.error("[chat/conversations] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out conversations that don't have a leader or admin
    const filteredData = (data || []).filter((item: any) => {
      const conv = item.conversations;
      if (!conv) return false;
      const members = conv.members || [];
      return members.some((m: any) => m.role === "group_leader" || m.role === "admin" || m.role === "owner");
    });

    return NextResponse.json(filteredData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
