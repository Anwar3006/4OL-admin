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
 * GET /api/chat/messages?conversation_id=XYZ
 * GET /api/chat/messages?id=XYZ
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversation_id = searchParams.get("conversation_id");
  const id = searchParams.get("id");

  if (!conversation_id && !id) {
    return NextResponse.json(
      { error: "conversation_id or id is required" },
      { status: 400 },
    );
  }

  try {
    const admin = getSupabaseAdmin();

    const baseQuery = admin
      .from("messages")
      .select(`*, sender:sender_id ( first_name, last_name )`)
      .eq("is_deleted", false);

    if (id) {
      const { data, error } = await baseQuery.eq("id", id).single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    } else {
      const { data, error } = await baseQuery
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/messages
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conversation_id, content, message_type, attachment_url, reply_to_id } =
      await req.json();

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("messages")
      .insert([{
        conversation_id,
        sender_id: user.id,
        content,
        message_type: message_type || "text",
        attachment_url,
        reply_to_id,
      }])
      .select()
      .single();

    if (error) {
      console.error("[chat/messages POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/messages
 */
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Message ID is required" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: message, error: fetchError } = await admin
      .from("messages")
      .select("sender_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin
      .from("messages")
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
