import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";
import { effectiveFlagState, isPostHogConfigured, listPostHogFlags, missingPostHogConfig } from "@/lib/posthog-admin";

/**
 * Pull-sync (P0-07): PostHog has no outbound webhook for flag changes, so
 * this is the only way to catch a change made directly in PostHog's own
 * dashboard and reflect it back into our table — both for flags we already
 * track (reconcile) and ones we don't have a row for yet (discover; e.g.
 * the 23 `category-*` flags the mobile app already uses). Triggered two
 * ways:
 *   - Vercel Cron (see vercel.json), authenticated with CRON_SECRET — same
 *     bearer pattern as features/reports/api/cron.ts.
 *   - A logged-in admin's "Sync now" button in Settings → Feature Flags,
 *     authenticated the normal session way (requireAdminApiUser).
 * Eventually consistent by design: one flag failing doesn't abort the rest
 * of the batch. Never deletes a row for a flag PostHog no longer has —
 * that's a judgment call for a human, not an automated sync.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron invokes with GET (see vercel.json) — matches
// features/reports/api/cron.ts's convention, so "Sync now" in the UI also
// calls this with GET rather than mixing verbs for the same action.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  let actorId: string | null = null;
  if (!isCron) {
    const auth = await requireAdminApiUser("settings.manage");
    if (!auth.ok) return adminAuthErrorResponse(auth);
    actorId = auth.user.id;
  }

  if (!isPostHogConfigured()) {
    return NextResponse.json(
      { error: `PostHog is not configured: set ${missingPostHogConfig().join(" and ")}.` },
      { status: 503 },
    );
  }

  const admin = getAdminClient();
  const { data: ourFlags, error } = await admin
    .from("feature_flags")
    .select("id, name, enabled, rollout_percentage");

  if (error) {
    console.error("[settings/feature-flags/sync] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load feature flags." }, { status: 500 });
  }

  let postHogFlags;
  try {
    postHogFlags = await listPostHogFlags();
  } catch (err) {
    const message = err instanceof Error ? err.message : "PostHog list failed";
    console.error("[settings/feature-flags/sync] PostHog list failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const postHogByKey = new Map(postHogFlags.map((f) => [f.key, effectiveFlagState(f)]));
  const ourNames = new Set((ourFlags ?? []).map((f) => f.name));

  let updated = 0;
  let unchanged = 0;
  let created = 0;
  let notFoundInPostHog = 0;

  // ── Reconcile flags we already track ────────────────────────────────
  for (const flag of ourFlags ?? []) {
    const state = postHogByKey.get(flag.name);
    if (!state) {
      notFoundInPostHog++;
      continue;
    }

    const changed = state.active !== flag.enabled || state.rolloutPercentage !== flag.rollout_percentage;
    if (!changed) {
      unchanged++;
      continue;
    }

    const previous = { enabled: flag.enabled, rollout_percentage: flag.rollout_percentage };
    await admin
      .from("feature_flags")
      .update({
        enabled: state.active,
        rollout_percentage: state.rolloutPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flag.id);

    // Only attribute to a real admin when one triggered this — settings_change_log.changed_by
    // is a NOT NULL FK to a real user, and the unattended cron run has no human to name.
    if (actorId) {
      await logSettingsChange(admin, actorId, "feature_flags", flag.name, previous, {
        enabled: state.active,
        rollout_percentage: state.rolloutPercentage,
      });
    }
    updated++;
  }

  // ── Discover PostHog flags we don't have a row for yet ──────────────
  for (const phFlag of postHogFlags) {
    if (ourNames.has(phFlag.key)) continue;
    const state = postHogByKey.get(phFlag.key)!;

    const { error: insertError } = await admin.from("feature_flags").insert({
      name: phFlag.key,
      description: phFlag.name || null,
      enabled: state.active,
      rollout_percentage: state.rolloutPercentage,
    });
    if (insertError) {
      console.error(`[settings/feature-flags/sync] failed to create "${phFlag.key}":`, insertError.message);
      continue;
    }

    if (actorId) {
      await logSettingsChange(admin, actorId, "feature_flags", phFlag.key, null, {
        enabled: state.active,
        rollout_percentage: state.rolloutPercentage,
      });
    }
    created++;
  }

  return NextResponse.json({
    checked: ourFlags?.length ?? 0,
    updated,
    unchanged,
    created,
    notFoundInPostHog,
  });
}
