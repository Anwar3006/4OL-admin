import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { applyUserMasking } from "@/lib/masking";
import { auditAdminRead, issueCanaryFor } from "@/lib/security-audit";

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

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Vary: "Cookie",
};

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

  const admin = getAdminClient();
  let query = admin
    .from("user_profiles")
    .select(
      "user_id, public_id, first_name, last_name, phone_number, region, status, account_types, sex, created_at, last_active",
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
      return NextResponse.json(
        { users: [], total: 0, limit: parsed.data.limit, offset: parsed.data.offset },
        { headers: NO_STORE_HEADERS },
      );
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

  // Part AK (AK-D9/D7): log the read (server-side anomaly trip is computed
  // inside) and attach this admin's canary token so a scraped copy of this
  // payload is attributable to the session that received it.
  void auditAdminRead(auth.user.id, "admin/users", rows.length, {
    search: parsed.data.search ?? null,
    plan: parsed.data.plan ?? null,
    offset: parsed.data.offset,
  });
  const canary = await issueCanaryFor(auth.user.id, "api_admin_users");

  // Best-effort enrichment: emails (better-auth users table) + plans.
  let emailById = new Map<string, string>();
  let memberPlanByUser = new Map<string, string>();
  const membershipsByUser = new Map<string, { providerId: string; role: string }[]>();
  const providerPlansByUser = new Map<string, string[]>();
  try {
    if (userIds.length) {
      const { data: authUsers } = await admin
        .from("users")
        .select("id, email")
        .in("id", userIds);
      emailById = new Map((authUsers ?? []).map((u) => [u.id, u.email]));
      const { data: subs } = await admin
        .from("user_subscriptions")
        .select("user_id, expires_at, subscription_tiers(name)")
        .in("user_id", userIds)
        .eq("status", "active");
      for (const sub of subs ?? []) {
        if (sub.expires_at && new Date(sub.expires_at) <= new Date()) continue;
        const tier = Array.isArray(sub.subscription_tiers) ? sub.subscription_tiers[0] : sub.subscription_tiers;
        if (tier?.name) memberPlanByUser.set(sub.user_id, `Member: ${tier.name}`);
      }
      const { data: memberships } = await admin.from("provider_members").select("user_id, provider_id, role").in("user_id", userIds);
      for (const member of memberships ?? []) {
        const list = membershipsByUser.get(member.user_id) ?? [];
        list.push({ providerId: member.provider_id, role: member.role });
        membershipsByUser.set(member.user_id, list);
      }
      const providerIds = [...new Set((memberships ?? []).map((member) => member.provider_id))];
      if (providerIds.length) {
        const { data: providerSubs } = await admin.from("facility_subscriptions")
          .select("facility_id,current_period_end,marketing_subscriptions(name)").in("facility_id", providerIds).eq("status", "active");
        const tierByProvider = new Map<string, string>();
        for (const sub of providerSubs ?? []) {
          if (sub.current_period_end && new Date(sub.current_period_end) <= new Date()) continue;
          const tier = Array.isArray(sub.marketing_subscriptions) ? sub.marketing_subscriptions[0] : sub.marketing_subscriptions;
          if (tier?.name) tierByProvider.set(sub.facility_id, String(tier.name));
        }
        for (const [userId, memberships] of membershipsByUser) {
          const plans = memberships.map((member) => tierByProvider.get(member.providerId)).filter((plan): plan is string => Boolean(plan));
          if (plans.length) providerPlansByUser.set(userId, [...new Set(plans)].map((plan) => `Business: ${plan}`));
        }
      }
    }
  } catch {
    // Enrichment is optional — masking + base columns still return.
  }

  return NextResponse.json(
    {
      users: rows.map((row) =>
        applyUserMasking(
          {
            ...row,
            email: emailById.get(row.user_id) ?? null,
            user_type: [
              ...(Array.isArray(row.account_types) && row.account_types.includes("member") ? ["Member"] : []),
              ...[...new Set((membershipsByUser.get(row.user_id) ?? []).map((member) => ["owner", "admin"].includes(member.role) ? "Provider admin" : "Provider staff"))],
            ],
            plan: [memberPlanByUser.get(row.user_id), ...(providerPlansByUser.get(row.user_id) ?? [])].filter(Boolean).join(" · ") || "Free",
            engagement_score: deriveEngagement(row.last_active),
          },
          isSuperAdmin,
        ),
      ),
      total: count ?? 0,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      // AK-D7 canary — invisible to the UI, present in any exfiltrated copy.
      ...(canary ? { _c: canary } : {}),
    },
    { headers: NO_STORE_HEADERS },
  );
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

  const admin = getAdminClient();
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
