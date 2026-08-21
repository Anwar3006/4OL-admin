import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin subscriptions management (FITNESS_MOCKUP_GAP_ANALYSIS.md, D6).
 *
 *   GET   /api/subscriptions/admin            — list entitlement grants (subscriptions.view)
 *   GET   /api/subscriptions/admin?userId=... — single user's subscription rows
 *   POST  /api/subscriptions/admin            — grant premium/lifetime (SUPER ADMIN only)
 *   PATCH /api/subscriptions/admin            — revoke a grant        (SUPER ADMIN only)
 *
 * Grant/revoke are restricted to super_admin via an EXPLICIT role check —
 * not the permission catalog — per the product decision that only the super
 * admin may assign premium tier / lifetime premium access. Paystack-origin
 * rows (source='paystack') will be written by the payment webhook later and
 * flow through the same list endpoint unchanged.
 */

const GrantSchema = z.object({
  userId: z.string().uuid(),
  tierKey: z.enum(["premium", "lifetime"]),
  // Optional override of the tier's default duration (days); ignored for
  // lifetime. Never <= 0.
  durationDays: z.number().int().min(1).max(3650).optional(),
  note: z.string().trim().max(500).optional(),
});

const RevokeSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
}).refine((v) => !!v.subscriptionId || !!v.userId, {
  message: "Provide subscriptionId or userId",
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_subscriptions")
    .select("id, user_id, tier_id, status, source, granted_by, starts_at, expires_at, paystack_reference, note, created_at, subscription_tiers(key, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (userId) query = query.eq("user_id", userId);
  if (status && ["active", "expired", "revoked"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: rows, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve display names in a second step — avoids fragile FK-name hints
  // on user_profiles (GenericStringError pattern).
  const ids = [...new Set((rows ?? []).flatMap((r) => [r.user_id, r.granted_by].filter(Boolean)))];
  const profiles = ids.length
    ? (await admin.from("user_profiles").select("user_id, first_name, last_name").in("user_id", ids)).data ?? []
    : [];
  const nameOf = new Map(profiles.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`]));

  return NextResponse.json({
    subscriptions: (rows ?? []).map((r) => ({
      ...r,
      user_name: nameOf.get(r.user_id) ?? r.user_id,
      granted_by_name: r.granted_by ? nameOf.get(r.granted_by) ?? r.granted_by : null,
    })),
    total: count ?? 0,
  });
}

export async function POST(req: NextRequest) {
  // List/read uses the permission catalog; GRANT is super admin only.
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Only the super admin can assign premium or lifetime access" },
      { status: 403 },
    );
  }

  const parsed = GrantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, tierKey, durationDays, note } = parsed.data;

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: tier, error: tierError } = await admin
    .from("subscription_tiers")
    .select("id, key, name, duration_days")
    .eq("key", tierKey)
    .maybeSingle();
  if (tierError || !tier) {
    return NextResponse.json({ error: "Subscription tier not found" }, { status: 400 });
  }

  // Replacement semantics: expire any current active grant, then insert the
  // new one (the partial unique index allows one active row per user).
  await admin
    .from("user_subscriptions")
    .update({ status: "expired", note: "Superseded by admin grant" })
    .eq("user_id", userId)
    .eq("status", "active");

  const effectiveDays = tierKey === "lifetime" ? null : durationDays ?? tier.duration_days;
  const startsAt = new Date().toISOString();
  const expiresAt = effectiveDays
    ? new Date(Date.now() + effectiveDays * 86_400_000).toISOString()
    : null;

  const { data: inserted, error: insertError } = await admin
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      tier_id: tier.id,
      status: "active",
      source: "admin_grant",
      granted_by: auth.user.id,
      starts_at: startsAt,
      expires_at: expiresAt,
      note: note ?? null,
    })
    .select("id")
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "subscription_grant",
    p_target_table: "user_subscriptions",
    p_record_id: inserted.id,
    p_description: `Assigned ${tier.name} to user ${userId}${expiresAt ? ` until ${expiresAt}` : " (lifetime)"}`,
  });

  // Best-effort in-app notice through the shared notifications pipeline.
  await admin.rpc("notify_fitness", {
    p_user_id: userId,
    p_type: "billing",
    p_title: `${tier.name} activated 🎉`,
    p_body: expiresAt
      ? `Your ${tier.name} access is active until ${new Date(expiresAt).toLocaleDateString()}.`
      : `Your ${tier.name} access is active — forever.`,
    p_metadata: { screen: "premium" },
  });

  return NextResponse.json({ success: true, subscriptionId: inserted.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Only the super admin can revoke premium or lifetime access" },
      { status: 403 },
    );
  }

  const parsed = RevokeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_subscriptions")
    .update({ status: "revoked", note: "Revoked by admin" })
    .eq("status", "active");
  if (parsed.data.subscriptionId) query = query.eq("id", parsed.data.subscriptionId);
  else query = query.eq("user_id", parsed.data.userId);

  const { data: revoked, error } = await query.select("id, user_id").single();
  if (error || !revoked) {
    return NextResponse.json({ error: "No active subscription found to revoke" }, { status: 404 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "subscription_revoke",
    p_target_table: "user_subscriptions",
    p_record_id: revoked.id,
    p_description: `Revoked subscription ${revoked.id} for user ${revoked.user_id}`,
  });

  return NextResponse.json({ success: true, subscriptionId: revoked.id });
}
