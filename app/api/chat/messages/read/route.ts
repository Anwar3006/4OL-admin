import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/chat/messages/read
 * 
 * Marks a conversation or specific message as read.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversation_id, message_id } = await req.json();

    if (!conversation_id) {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Mark the conversation as read (reset unread_count)
    const { error: rpcError } = await admin.rpc("fn_mark_conversation_read", {
      p_conversation_id: conversation_id,
      p_user_id: session.user.id,
    });

    if (rpcError) {
      console.error("[chat/messages/read] RPC error:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // 2. If message_id is provided, track it in message_reads
    if (message_id) {
       await admin.from("message_reads").upsert([
         {
           message_id,
           user_id: session.user.id,
           read_at: new Date().toISOString(),
         }
       ], { onConflict: 'message_id,user_id' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
