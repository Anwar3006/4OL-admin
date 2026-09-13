import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";

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

    const { error: rpcError } = await admin.rpc("fn_mark_conversation_read", {
      p_conversation_id: conversation_id,
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error("[chat/messages/read] RPC error:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (message_id) {
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
