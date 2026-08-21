import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ModerationQuerySchema = z.object({
  status: z.string().trim().max(60).optional(),
  contentType: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const ModerationActionSchema = z.object({
  id: z.uuid(),
  action: z.enum(["dismiss", "warn", "remove", "ban"]),
  notes: z.string().trim().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("ai.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ModerationQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
    contentType: req.nextUrl.searchParams.get("contentType") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("content_moderation_flags")
    .select(
      "id, content_type, content_id, report_reason, report_detail, ai_detected, ai_confidence, ai_reason, status, action_taken, action_notes, created_at",
      { count: "exact" },
    );

  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.contentType) {
    query = query.eq("content_type", parsed.data.contentType);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[ai/moderation-queue] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load moderation queue." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("ai.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = ModerationActionSchema.safeParse(
    await req.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid moderation action", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("moderate_content", {
    p_flag_id: parsed.data.id,
    p_action: parsed.data.action,
    // Passed explicitly — this route calls via a service-role client,
    // which has no JWT/auth context, so the RPC's own auth.uid() fallback
    // always evaluates to NULL. Without this, moderation actions taken
    // through the admin UI would silently record no reviewer at all.
    p_admin_id: user.id,
    p_action_notes: parsed.data.notes ?? null,
  });

  if (error) {
    console.error("[ai/moderation-queue] moderation error:", error.message);
    return NextResponse.json(
      { error: "Failed to update moderation item." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
