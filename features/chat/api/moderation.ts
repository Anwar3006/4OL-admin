import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";

async function getRequestUser(req: NextRequest) {
  const token = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")
    .trim();
  if (!token) return null;
  const admin = getAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

const VALID_CONTENT_TYPES = ["message", "conversation"] as const;
type ChatContentType = (typeof VALID_CONTENT_TYPES)[number];

/**
 * POST /api/chat/moderation
 *
 * Reports a message or conversation for moderation review. Writes to
 * content_moderation_flags (the single source of truth for moderation
 * across content types). is_flagged on the target messages/conversations
 * row is then denormalized automatically by the DB trigger
 * fn_sync_moderation_flag (see migrations/20260710_message_moderation_sync.sql)
 * — this route does not, and should not, set is_flagged itself.
 *
 * Body: {
 *   content_type: "message" | "conversation",
 *   content_id: string,
 *   report_reason: string,
 *   report_detail?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content_type, content_id, report_reason, report_detail } =
      await req.json();

    if (!content_type || !VALID_CONTENT_TYPES.includes(content_type)) {
      return NextResponse.json(
        {
          error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!content_id) {
      return NextResponse.json(
        { error: "content_id is required" },
        { status: 400 },
      );
    }
    if (!report_reason || typeof report_reason !== "string") {
      return NextResponse.json(
        { error: "report_reason is required" },
        { status: 400 },
      );
    }

    const admin = getAdminClient();

    // Confirm the target actually exists before creating a flag pointed at
    // it — content_id is stored as free-form text (fans out across
    // multiple tables), so nothing at the DB level enforces this.
    const table: Record<ChatContentType, string> = {
      message: "messages",
      conversation: "conversations",
    };
    const { data: target, error: targetErr } = await admin
      .from(table[content_type as ChatContentType])
      .select("id")
      .eq("id", content_id)
      .maybeSingle();

    if (targetErr) {
      return NextResponse.json(
        { error: targetErr.message },
        { status: 500 },
      );
    }
    if (!target) {
      return NextResponse.json(
        { error: `${content_type} not found` },
        { status: 404 },
      );
    }

    // AF-05 G5 — coalesce duplicate reports exactly like the
    // report_chat_content() RPC: extend an existing pending_review flag
    // instead of stacking a new row per report. Without this the admin BFF
    // path and the direct-RPC mobile path disagreed on dedup.
    const { data: existingFlag, error: existingErr } = await admin
      .from("content_moderation_flags")
      .select("id, report_detail")
      .eq("content_type", content_type)
      .eq("content_id", content_id)
      .eq("status", "pending_review")
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    if (existingFlag?.id) {
      const appended =
        (existingFlag.report_detail
          ? `${existingFlag.report_detail} | `
          : "") +
        `Additional report by ${user.id}: ${report_detail ?? report_reason}`;
      const { data: updated, error: updateErr } = await admin
        .from("content_moderation_flags")
        .update({ report_detail: appended, updated_at: new Date().toISOString() })
        .eq("id", existingFlag.id)
        .select()
        .single();
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json(
        { ...updated, deduplicated: true },
        { status: 200 },
      );
    }

    const { data, error } = await admin
      .from("content_moderation_flags")
      .insert([
        {
          content_type,
          content_id,
          reported_by: user.id,
          report_reason,
          report_detail: report_detail ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[chat/moderation POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, deduplicated: false }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
