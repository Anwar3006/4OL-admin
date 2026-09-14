import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getAdminClient } from "@/lib/db/admin";
import { GrantError, grantPeriodPremium, grantSubscription } from "../grant-logic";

/**
 * Bulk premium grants -- give many users (a picked list, or every active
 * user) free access to Fitness, Period Tracker, or the entire app for a
 * chosen duration, in one action.
 *
 *   POST /api/subscriptions/admin/bulk  { ..., preview: true }  — resolve
 *     the target set and return a count + name sample, write nothing. The
 *     "how many people will this affect" check no other bulk action in
 *     this codebase has (features/users/ui/BulkUserActionsDialog.tsx and
 *     features/marketing/api/campaigns-batch.ts both fire immediately).
 *   POST /api/subscriptions/admin/bulk  { ..., preview: false } — resolve
 *     the same target set and actually grant each one, independently (one
 *     bad row never aborts the batch), then write ONE audit row for the
 *     whole batch (features/marketing/api/campaigns-batch.ts:50-59's
 *     precedent) rather than one per user.
 *
 * Reuses the exact same per-user grant logic as the single-user route
 * (../grant-logic.ts) so the two can never drift on tier lookup,
 * replacement semantics, or the Period Tracker 90-day cap.
 */

const BulkGrantSchema = z.object({
  targets: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("all_active") }),
    z.object({ mode: z.literal("selected"), userIds: z.array(z.string().uuid()).min(1).max(500) }),
  ]),
  scope: z.enum(["all_access", "fitness_only", "period_only"]),
  tierKey: z.enum(["premium", "lifetime"]).default("premium"),
  durationDays: z.number().int().min(1).max(3650),
  reason: z.string().trim().min(4).max(500),
  preview: z.boolean().default(false),
});

async function resolveTargets(
  admin: ReturnType<typeof getAdminClient>,
  targets: z.infer<typeof BulkGrantSchema>["targets"],
) {
  if (targets.mode === "all_active") {
    const { data, error } = await admin
      .from("user_profiles")
      .select("user_id, first_name, last_name")
      .eq("status", "active");
    if (error) throw new GrantError("Unable to resolve active users", 500);
    return data ?? [];
  }
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", targets.userIds);
  if (error) throw new GrantError("Unable to resolve selected users", 500);
  return data ?? [];
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("subscriptions.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  if (auth.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Only the super admin can grant premium access" },
      { status: 403 },
    );
  }

  const parsed = BulkGrantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { targets, scope, tierKey, durationDays, reason, preview } = parsed.data;

  const admin = getAdminClient();
  let resolved: { user_id: string; first_name: string; last_name: string }[];
  try {
    resolved = await resolveTargets(admin, targets);
  } catch (err) {
    if (err instanceof GrantError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Unable to resolve targets" }, { status: 500 });
  }

  if (preview) {
    return NextResponse.json({
      count: resolved.length,
      sample: resolved.slice(0, 5).map((u) => `${u.first_name} ${u.last_name}`.trim() || u.user_id),
    });
  }

  if (resolved.length === 0) {
    return NextResponse.json({ error: "No users match this target" }, { status: 400 });
  }

  const failed: { userId: string; error: string }[] = [];
  let granted = 0;
  for (const user of resolved) {
    try {
      if (scope === "period_only") {
        await grantPeriodPremium(admin, {
          userId: user.user_id,
          durationDays,
          reason,
          source: "manual",
          grantedBy: auth.user.id,
        });
      } else {
        await grantSubscription(admin, {
          userId: user.user_id,
          tierKey,
          durationDays,
          note: reason,
          scope,
          grantedBy: auth.user.id,
        });
      }
      granted += 1;
    } catch (err) {
      failed.push({
        userId: user.user_id,
        error: err instanceof GrantError ? err.message : "Grant failed",
      });
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "bulk_subscription_grant",
    p_target_table: scope === "period_only" ? "period_premium_grants" : "user_subscriptions",
    p_description: `Bulk-granted ${scope} (${durationDays} days) to ${granted}/${resolved.length} user(s) -- ${targets.mode === "all_active" ? "all active users" : `${targets.userIds.length} selected`}. Reason: ${reason}`,
    p_severity: "warning",
    p_new_data: {
      scope,
      tierKey,
      durationDays,
      reason,
      targetMode: targets.mode,
      requested: resolved.length,
      granted,
      failed: failed.length,
    },
  });

  return NextResponse.json({ success: true, granted, failed });
}
