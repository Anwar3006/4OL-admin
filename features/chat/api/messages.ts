import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getAdminClient();
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
    const admin = getAdminClient();

    const baseQuery = admin
      .from("messages")
      .select(`*, sender:sender_id ( first_name, last_name, avatar_url )`)
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

    // Notify other conversation members (push + in-app notification center
    // + bell badge, all via the shared dispatch_notification primitive).
    // Never let a notification failure affect the message-send response —
    // the message already sent successfully, that's the route's contract.
    try {
      await notifyConversationMembers({ admin, conversationId: conversation_id, message: data });
    } catch (notifyError) {
      console.error("[chat/messages POST] Failed to notify members:", notifyError);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Notifies every other member of a conversation about a new message, via
 * the shared `dispatch_notification` Postgres RPC (see mobile repo's
 * supabase/migrations/20260812000000_notification_dispatch_primitive.sql)
 * — the same primitive used by the medication/workout reminder cron jobs,
 * so there is exactly one Expo-push-batching implementation in the whole
 * system.
 *
 * `is_muted` suppresses notification; `is_archived` does not — archiving is
 * inbox organization, not muting, so an archived-but-not-muted member
 * should still be notified.
 */
async function notifyConversationMembers({
  admin,
  conversationId,
  message,
}: {
  admin: ReturnType<typeof getAdminClient>;
  conversationId: string;
  message: { id: string; sender_id: string; content: string | null; sender?: { first_name?: string; last_name?: string } | null };
}) {
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("type, name, group_name")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    console.error("[chat/messages POST] Failed to load conversation for notification:", conversationError?.message);
    return;
  }

  const { data: members, error: membersError } = await admin
    .from("conversation_members")
    .select("user_id, is_muted, left_at")
    .eq("conversation_id", conversationId);

  if (membersError || !members) {
    console.error("[chat/messages POST] Failed to load conversation members:", membersError?.message);
    return;
  }

  const recipientUserIds = members
    .filter((m) => m.user_id !== message.sender_id && !m.left_at && !m.is_muted)
    .map((m) => m.user_id);

  if (recipientUserIds.length === 0) return;

  // NOTE: not touching conversation_members.unread_count here. A comment
  // in the mobile app's useDirectMessages.ts implies something already
  // increments it server-side on message insert, but no trigger definition
  // for it exists in any committed migration in this repo. Before assuming
  // either way, run against the live DB:
  //   SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
  //   WHERE tgrelid = 'public.messages'::regclass;
  // If nothing shows up, add an explicit UPDATE here
  // (conversation_id = ? AND user_id != sender AND left_at IS NULL) —
  // don't add it speculatively alongside a trigger that might already
  // exist, or unread counts will double-increment.

  // Notification preferences: exclude anyone who's opted out of chat
  // notifications (master switch or the chats-specific toggle), same
  // suppression semantics as is_muted above — opted-out means neither a
  // push nor an in-app notifications row, not just a silenced push.
  const { data: prefs } = await admin
    .from("user_profiles")
    .select("user_id, push_notifications_enabled, push_chats_enabled")
    .in("user_id", recipientUserIds);

  const optedIn = new Set(
    (prefs ?? [])
      .filter((p) => p.push_notifications_enabled && p.push_chats_enabled)
      .map((p) => p.user_id),
  );
  const finalRecipientIds = recipientUserIds.filter((id) => optedIn.has(id));

  if (finalRecipientIds.length === 0) return;

  const type = conversation.type === "group" ? "group_chat" : "dm";
  const senderName = [message.sender?.first_name, message.sender?.last_name].filter(Boolean).join(" ") || "Someone";
  const groupTitle = conversation.name || conversation.group_name || "Group";
  const title = type === "group_chat" ? `${senderName} • ${groupTitle}` : senderName;
  const body = message.content?.trim() ? message.content : "Sent an attachment";

  const recipients = finalRecipientIds.map((userId) => ({
    user_id: userId,
    title,
    body,
    type,
    metadata: {
      conversation_id: conversationId,
      message_id: message.id,
      sender_id: message.sender_id,
      sender_name: senderName,
    },
    channel_id: "chat-messages",
  }));

  const { error: dispatchError } = await admin.rpc("dispatch_notification", { p_recipients: recipients });
  if (dispatchError) {
    console.error("[chat/messages POST] dispatch_notification error:", dispatchError.message);
  }
}

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
