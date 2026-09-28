import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";
import { getLiveMemberRole, isLiveMember, isManagerRole } from "@/features/chat/lib/membership";

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
    const admin = getAdminClient();

    const baseQuery = admin
      .from("messages")
      .select(`*, sender:sender_id ( first_name, last_name, avatar_url )`)
      .eq("is_deleted", false);

    if (id) {
      const { data, error } = await baseQuery.eq("id", id).single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!(await isLiveMember(admin, data.conversation_id, user.id))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(data);
    } else {
      if (!(await isLiveMember(admin, conversation_id as string, user.id))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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

// Gap Analysis CH-D6 — per-user send throttle (sliding window). In-process
// only: serverless instances have independent windows, so this is an
// abuse/spam speed bump rather than a strict global cap. Fail-open — a
// throttle bookkeeping problem must never block legitimate sends.
const MESSAGE_SEND_WINDOW_MS = 60_000;
const MESSAGE_SEND_MAX_PER_WINDOW = 30;
const sendWindowByUser = new Map<string, { windowStart: number; count: number }>();

function isMessageSendThrottled(userId: string): boolean {
  const now = Date.now();
  const entry = sendWindowByUser.get(userId);

  if (!entry || now - entry.windowStart >= MESSAGE_SEND_WINDOW_MS) {
    sendWindowByUser.set(userId, { windowStart: now, count: 1 });
    // Opportunistic cleanup to keep the map bounded.
    if (sendWindowByUser.size > 5000) {
      for (const [key, value] of sendWindowByUser) {
        if (now - value.windowStart >= MESSAGE_SEND_WINDOW_MS) {
          sendWindowByUser.delete(key);
        }
      }
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MESSAGE_SEND_MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const {
      conversation_id,
      content,
      message_type,
      attachment_url,
      attachment_name,
      attachment_size,
      reply_to_id,
    } = await req.json();

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    if (isMessageSendThrottled(user.id)) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please wait a moment." },
        { status: 429 },
      );
    }

    const admin = getAdminClient();

    if (!(await isLiveMember(admin, conversation_id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("messages")
      .insert([{
        conversation_id,
        sender_id: user.id,
        content,
        message_type: message_type || "text",
        attachment_url,
        attachment_name: attachment_name ?? null,
        attachment_size: attachment_size ?? null,
        reply_to_id,
      }])
      .select(`*, sender:sender_id ( first_name, last_name, avatar_url )`)
      .single();

    if (error) {
      console.error("[chat/messages POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // G1 (AF-05): notification is the DB trigger's job, not this route's.
    // fn_on_new_message() (mobile repo migration 20260828170100) fires on EVERY
    // messages insert — BFF, paid-chat RPC and admin system messages alike — and
    // is the SINGLE writer of both the push/in-app dispatch and
    // conversation_members.unread_count. The duplicate notifyConversationMembers
    // call that used to sit here produced a second notification + bell entry for
    // every message sent through this route (verified against the live trigger,
    // which does not exclude any message_type); it has been removed so there is
    // exactly one dispatch per message.

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * (AF-05 G1) notifyConversationMembers was removed. Message notifications are
 * dispatched exclusively by the fn_on_new_message() DB trigger so there is one
 * writer and no duplicate bell entries / pushes. Do not re-add a dispatch here.
 */

/**
 * PATCH /api/chat/messages
 *
 * Edits a message's content. Only the original sender may edit their own
 * message. Sets is_edited=true and edited_at=now() — mirrors the DB
 * columns that previously had no write path anywhere in this codebase.
 *
 * Body: { id: string, content: string }
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, content } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from("messages")
      .select("sender_id, is_deleted")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (existing.is_deleted) {
      return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
    }
    if (existing.sender_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("messages")
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`*, sender:sender_id ( first_name, last_name, avatar_url )`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

    const admin = getAdminClient();

    const { data: message, error: fetchError } = await admin
      .from("messages")
      .select("sender_id, conversation_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Delete authz (AF-05): the sender may always delete their own message. A
    // conversation manager (owner/moderator) or a platform admin may delete ANY
    // message in the conversation — this used to be sender-only, so moderators
    // could not remove others' messages/media.
    if (message.sender_id !== user.id) {
      const actorRole = await getLiveMemberRole(admin, message.conversation_id, user.id);
      const isManager = isManagerRole(actorRole);
      let isPlatformAdmin = false;
      if (!isManager) {
        const { data: profile } = await admin
          .from("user_profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        isPlatformAdmin = profile?.role === "admin" || profile?.role === "super_admin";
      }
      if (!isManager && !isPlatformAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
