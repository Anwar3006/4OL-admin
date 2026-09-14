import { getAdminClient } from "@/lib/db/admin";

/**
 * Shared per-user grant logic behind both the single-user route
 * (route.ts) and the bulk route (bulk/route.ts) — extracted so the two
 * never drift on tier lookup, replacement semantics, or notification
 * copy. Callers own audit logging: a single grant logs once per call,
 * a bulk grant logs once per batch (see bulk/route.ts), so it does not
 * live in here.
 */

export class GrantError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
  }
}

type AdminClient = ReturnType<typeof getAdminClient>;

const PERIOD_DURATION_DAYS = [7, 14, 30, 60, 90] as const;

/**
 * Writes a user_subscriptions row (scope: all_access | fitness_only).
 * all_access bridges to Period Tracker automatically via
 * get_my_entitlement() -- see supabase/migrations/20260904_scoped_subscription_passes.sql.
 */
export async function grantSubscription(
  admin: AdminClient,
  params: {
    userId: string;
    tierKey: "premium" | "lifetime";
    durationDays?: number;
    note?: string;
    scope: "all_access" | "fitness_only";
    grantedBy: string;
  },
) {
  const { userId, tierKey, durationDays, note, scope, grantedBy } = params;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) throw new GrantError("User not found", 404);

  const { data: tier, error: tierError } = await admin
    .from("subscription_tiers")
    .select("id, key, name, duration_days")
    .eq("key", tierKey)
    .maybeSingle();
  if (tierError || !tier) throw new GrantError("Subscription tier not found", 400);

  // Replacement semantics: expire any current active grant, then insert
  // the new one (the partial unique index allows one active row per user).
  await admin
    .from("user_subscriptions")
    .update({ status: "expired", note: "Superseded by admin grant" })
    .eq("user_id", userId)
    .eq("status", "active");

  const effectiveDays = tierKey === "lifetime" ? null : (durationDays ?? tier.duration_days);
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
      granted_by: grantedBy,
      starts_at: startsAt,
      expires_at: expiresAt,
      note: note ?? null,
      scope,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new GrantError(insertError?.message ?? "Insert failed", 500);
  }

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

  return { id: inserted.id, tierName: tier.name, expiresAt };
}

/**
 * Writes a period_premium_grants row directly (Period Tracker's own,
 * separate entitlement system -- see features/period/api/data-post.ts's
 * `grant_premium` action, which this mirrors exactly). Duration is
 * capped at 90 days in three places (this validation, a Zod schema in
 * the period feature, and a Postgres CHECK constraint) as a deliberate
 * "no indefinite access" policy -- do not raise it here without also
 * raising the DB constraint and the period feature's own schema.
 */
export async function grantPeriodPremium(
  admin: AdminClient,
  params: {
    userId: string;
    durationDays: number;
    reason: string;
    notes?: string;
    source?: string;
    grantedBy: string;
  },
) {
  const { userId, durationDays, reason, notes, source, grantedBy } = params;
  if (!(PERIOD_DURATION_DAYS as readonly number[]).includes(durationDays)) {
    throw new GrantError(
      `Period Tracker duration must be one of ${PERIOD_DURATION_DAYS.join(", ")} days`,
      400,
    );
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) throw new GrantError("User not found", 404);

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + durationDays * 86_400_000);

  const { data, error } = await admin
    .from("period_premium_grants")
    .insert({
      user_id: userId,
      tier: "cycle_pro",
      source: source ?? "manual",
      reason,
      notes: notes ?? null,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: grantedBy,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new GrantError(error?.message ?? "Unable to grant premium access", 500);
  }

  await admin.rpc("notify_fitness", {
    p_user_id: userId,
    p_type: "billing",
    p_title: "Cycle Pro activated 🌸",
    p_body: `Your Period Tracker Cycle Pro access is active until ${expiresAt.toLocaleDateString()}.`,
    p_metadata: { screen: "period" },
  });

  return { id: data.id, expiresAt: expiresAt.toISOString() };
}
