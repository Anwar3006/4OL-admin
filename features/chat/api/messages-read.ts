import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";
import { isLiveMember } from "@/features/chat/lib/membership";

/**
 * POST /api/chat/messages/read
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conversation_id, message_id } = await req.json();

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Service-role client: without this, a non-member could write read
    // receipts against any message. A refused call is harmless to the app —
    // markConversationRead treats every failure as non-fatal.
    if (!(await isLiveMember(admin, conversation_id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: rpcError } = await admin.rpc("fn_mark_conversation_read", {
      p_conversation_id: conversation_id,
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error("[chat/messages/read] RPC error:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (message_id) {
      // The receipt must be for a message in THIS conversation, not any id.
      const { data: msg } = await admin
        .from("messages")
        .select("id")
        .eq("id", message_id)
        .eq("conversation_id", conversation_id)
        .maybeSingle();
      if (!msg) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      await admin.from("message_reads").upsert(
        [{ message_id, user_id: user.id, read_at: new Date().toISOString() }],
        { onConflict: "message_id,user_id" },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
