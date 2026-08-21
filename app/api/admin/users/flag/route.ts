import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const FlagQuerySchema = z.object({
  status: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateFlagSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
  detail: z.string().trim().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = FlagQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
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
      "id, content_id, report_reason, report_detail, status, action_taken, ai_detected, reported_by, created_at",
      { count: "exact" },
    )
    .eq("content_type", "profile");

  if (parsed.data.status) query = query.eq("status", parsed.data.status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[admin/users/flag GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load flagged users." }, { status: 500 });
  }

  const userIds = Array.from(new Set((data ?? []).map((row) => row.content_id)));
  const { data: profiles } = userIds.length
    ? await admin.from("user_profiles").select("user_id, first_name, last_name, status").in("user_id", userIds)
    : { data: [] as { user_id: string; first_name: string; last_name: string; status: string }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return NextResponse.json({
    items: (data ?? []).map((row) => {
      const profile = profileById.get(row.content_id);
      return {
        id: row.id,
        userId: row.content_id,
        name: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "Unknown user",
        userStatus: profile?.status ?? "unknown",
        reason: row.report_reason,
        detail: row.report_detail,
        status: row.status,
        actionTaken: row.action_taken,
        // "Flagged By" column (mockup): AI Moderation vs User Reports.
        flaggedBy: row.ai_detected ? "AI Moderation" : "User Reports",
        reportedBy: row.reported_by,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateFlagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("create_profile_flag", {
    p_user_id: parsed.data.userId,
    p_admin_id: user.id,
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail ?? null,
  });

  if (error) {
    console.error("[admin/users/flag POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to flag user." }, { status: 500 });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}
