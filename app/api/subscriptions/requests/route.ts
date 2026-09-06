import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Subscription upgrade requests (Mapping Audit "three scoped passes"
 * gap-closure). There is no self-serve payment yet, so mobile's "Choose
 * your pass" screen writes a request row (via request_subscription_upgrade
 * RPC) instead of charging anyone. This route is the admin queue: list
 * pending requests, and fulfil (perform the actual grant) or decline them.
 *
 *   GET   /api/subscriptions/requests             — list (subscriptions.view)
 *   PATCH /api/subscriptions/requests              — fulfil/decline/cancel (SUPER ADMIN, mirrors /api/subscriptions/admin)
 */

const PLATFORM_TIER_DURATION_DAYS: Record<string, number | null> = {
  premium: 30,
  lifetime: null,
};

const PERIOD_TIER_DURATION_DAYS = 30;

const ReviewSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["fulfill", "decline"]),
  durationDays: z.number().int().min(1).max(3650).optional(),
  reason: z.string().trim().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  const admin = getAdminClient();
  let query = admin
    .from("subscription_upgrade_requests")
    .select("id, user_id, pass_type, tier_key, note, status, requested_at, reviewed_by, reviewed_at, decline_reason", { count: "exact" })
    .order("requested_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status !== "all") query = query.eq("status", status);

  const { data: rows, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  const profiles = userIds.length
    ? (await admin.from("user_profiles").select("user_id, first_name, last_name, email").in("user_id", userIds)).data ?? []
    : [];
  const profileOf = new Map(profiles.map((p) => [p.user_id, p]));

  return NextResponse.json({
    requests: (rows ?? []).map((r) => {
      const profile = profileOf.get(r.user_id);
      return {
        ...r,
        user_name: profile ? `${profile.first_name} ${profile.last_name}` : r.user_id,
        user_email: profile?.email ?? null,
      };
    }),
    total: count ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Only the super admin can fulfil or decline subscription requests" },
      { status: 403 },
    );
  }

  const parsed = ReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }
  const { requestId, action, durationDays, reason } = parsed.data;

  if (action === "decline" && !reason) {
    return NextResponse.json({ error: "A reason is required to decline a request" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: request, error: fetchError } = await admin
    .from("subscription_upgrade_requests")
    .select("id, user_id, pass_type, tier_key, status")
    .eq("id", requestId)
    .maybeSingle();
  if (fetchError || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: `Request is already ${request.status}` }, { status: 409 });
  }

  if (action === "decline") {
    const { error } = await admin
      .from("subscription_upgrade_requests")
      .update({ status: "declined", reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), decline_reason: reason })
      .eq("id", requestId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.rpc("log_admin_activity", {
      p_admin_id: auth.user.id,
      p_action_type: "subscription_request_declined",
      p_target_table: "subscription_upgrade_requests",
      p_record_id: requestId,
      p_description: `Declined ${request.pass_type} (${request.tier_key}) request for user ${request.user_id}: ${reason}`,
    });
    return NextResponse.json({ success: true });
  }

  // action === "fulfill" — perform the actual grant.
  const startsAt = new Date();

  if (request.pass_type === "plasence_only") {
    const days = durationDays ?? PERIOD_TIER_DURATION_DAYS;
    const expiresAt = new Date(startsAt.getTime() + days * 86_400_000);
    const { data: grant, error } = await admin
      .from("period_premium_grants")
      .insert({
        user_id: request.user_id,
        tier: request.tier_key,
        source: "admin_grant",
        reason: "Fulfilled subscription upgrade request",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        granted_by: auth.user.id,
      })
      .select("id")
      .single();
    if (error || !grant) {
      return NextResponse.json({ error: error?.message ?? "Grant failed" }, { status: 500 });
    }
  } else {
    const scope = request.pass_type === "fitness_only" ? "fitness_only" : "all_access";
    const { data: tier, error: tierError } = await admin
      .from("subscription_tiers")
      .select("id, name, duration_days")
      .eq("key", request.tier_key)
      .maybeSingle();
    if (tierError || !tier) {
      return NextResponse.json({ error: "Subscription tier not found" }, { status: 400 });
    }

    await admin
      .from("user_subscriptions")
      .update({ status: "expired", note: "Superseded by fulfilled upgrade request" })
      .eq("user_id", request.user_id)
      .eq("status", "active");

    const effectiveDays = request.tier_key === "lifetime" ? null : durationDays ?? tier.duration_days ?? PLATFORM_TIER_DURATION_DAYS[request.tier_key];
    const expiresAt = effectiveDays ? new Date(startsAt.getTime() + effectiveDays * 86_400_000).toISOString() : null;

    const { data: inserted, error: insertError } = await admin
      .from("user_subscriptions")
      .insert({
        user_id: request.user_id,
        tier_id: tier.id,
        status: "active",
        source: "admin_grant",
        granted_by: auth.user.id,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt,
        note: "Fulfilled subscription upgrade request",
        scope,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message ?? "Grant failed" }, { status: 500 });
    }

    await admin.rpc("notify_fitness", {
      p_user_id: request.user_id,
      p_type: "billing",
      p_title: `${tier.name} activated 🎉`,
      p_body: expiresAt
        ? `Your ${tier.name} access is active until ${new Date(expiresAt).toLocaleDateString()}.`
        : `Your ${tier.name} access is active — forever.`,
      p_metadata: { screen: "premium" },
    });
  }

  const { error: statusError } = await admin
    .from("subscription_upgrade_requests")
    .update({ status: "fulfilled", reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "subscription_request_fulfilled",
    p_target_table: "subscription_upgrade_requests",
    p_record_id: requestId,
    p_description: `Fulfilled ${request.pass_type} (${request.tier_key}) request for user ${request.user_id}`,
  });

  return NextResponse.json({ success: true });
}
