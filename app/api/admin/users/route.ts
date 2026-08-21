import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { applyUserMasking } from "@/lib/masking";

// Admin user list with server-side PHI masking (Gap Analysis Part C.5).
// Full phone/email/NHIS only for super_admin; everyone else masked.

const UsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  plan: z.string().trim().max(40).optional(),
  status: z.string().trim().max(40).optional(),
  nhis: z.enum(["linked", "unlinked"]).optional(),
  region: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest", "last_active"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Engagement % derived from last_active recency (decision C-D1: derive first). */
function deriveEngagement(lastActive: string | null): number {
  if (!lastActive) return 5;
  const days = (Date.now() - new Date(lastActive).getTime()) / 86_400_000;
  if (days <= 1) return 95;
  if (days <= 7) return 75;
  if (days <= 30) return 45;
  if (days <= 90) return 20;
  return 5;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const isSuperAdmin = auth.role === SUPER_ADMIN_ROLE;

  const parsed = UsersQuerySchema.safeParse({
    search: req.nextUrl.searchParams.get("search") || undefined,
    plan: req.nextUrl.searchParams.get("plan") || undefined,
    status: req.nextUrl.searchParams.get("status") || undefined,
    nhis: req.nextUrl.searchParams.get("nhis") || undefined,
    region: req.nextUrl.searchParams.get("region") || undefined,
    sort: req.nextUrl.searchParams.get("sort") || undefined,
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
    .from("user_profiles")
    .select(
      "user_id, public_id, first_name, last_name, phone_number, region, nhis_number, status, user_type, sex, created_at, last_active",
      { count: "exact" },
    )
    .eq("role", "user");

  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.region) query = query.eq("region", parsed.data.region);
  if (parsed.data.nhis === "linked") {
    query = query.not("nhis_number", "is", null).neq("nhis_number", "");
  } else if (parsed.data.nhis === "unlinked") {
    query = query.or("nhis_number.is.null,nhis_number.eq.");
  }
  if (parsed.data.search) {
    query = query.or(
      `first_name.ilike.%${parsed.data.search}%,last_name.ilike.%${parsed.data.search}%,public_id.ilike.%${parsed.data.search}%,phone_number.ilike.%${parsed.data.search}%`,
    );
  }
  if (parsed.data.plan) {
    // Plan filter resolves through user_subscriptions first. Accepts a
    // comma-separated list so "all paid plans" views need one request.
    const plans = parsed.data.plan
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const { data: subs } = await admin
      .from("user_subscriptions")
      .select("user_id")
      .in("plan", plans);
    const ids = (subs ?? []).map((s) => s.user_id);
    if (ids.length === 0) {
      return NextResponse.json({ users: [], total: 0, limit: parsed.data.limit, offset: parsed.data.offset });
    }
    query = query.in("user_id", ids);
  }

  if (parsed.data.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (parsed.data.sort === "last_active") {
    query = query.order("last_active", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(
    parsed.data.offset,
    parsed.data.offset + parsed.data.limit - 1,
  );

  if (error) {
    console.error("[admin/users GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }

  const rows = data ?? [];
  const userIds = rows.map((r) => r.user_id);

  // Best-effort enrichment: emails (better-auth users table) + plans.
  let emailById = new Map<string, string>();
  let planByUser = new Map<string, string>();
  try {
    if (userIds.length) {
      const { data: authUsers } = await admin
        .from("users")
        .select("id, email")
        .in("id", userIds);
      emailById = new Map((authUsers ?? []).map((u) => [u.id, u.email]));
      const { data: subs } = await admin
        .from("user_subscriptions")
        .select("user_id, plan, status")
        .in("user_id", userIds)
        .eq("status", "active");
      planByUser = new Map((subs ?? []).map((s) => [s.user_id, s.plan]));
    }
  } catch {
    // Enrichment is optional — masking + base columns still return.
  }

  return NextResponse.json({
    users: rows.map((row) =>
      applyUserMasking(
        {
          ...row,
          email: emailById.get(row.user_id) ?? null,
          plan: planByUser.get(row.user_id) ?? "free",
          engagement_score: deriveEngagement(row.last_active),
          nhis_linked: Boolean(row.nhis_number),
        },
        isSuperAdmin,
      ),
    ),
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

const UpdateStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["active", "inactive", "suspended", "banned"]),
});

/** Status changes (suspend/activate/ban) — users.edit. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = UpdateStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_profiles")
    .update({ status: parsed.data.status })
    .eq("user_id", parsed.data.userId);

  if (error) {
    console.error("[admin/users PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update user status." }, { status: 500 });
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "user_status_change",
    target_table: "user_profiles",
    new_data: { user_id: parsed.data.userId, status: parsed.data.status },
  });

  return NextResponse.json({ success: true });
}
