import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";
import { getPostHogFlagState, isPostHogConfigured, missingPostHogConfig } from "@/lib/posthog-admin";

/**
 * Pull-sync (P0-07): PostHog has no outbound webhook for flag changes, so
 * this is the only way to catch a flag edited directly in PostHog's own
 * dashboard and reflect it back into our table. Triggered two ways:
 *   - Vercel Cron (see vercel.json), authenticated with CRON_SECRET — same
 *     bearer pattern as features/reports/api/cron.ts.
 *   - A logged-in admin's "Sync now" button in Settings → Feature Flags,
 *     authenticated the normal session way (requireAdminApiUser).
 * Eventually consistent by design: one flag's lookup failing doesn't abort
 * the rest of the batch.
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
  const { data: flags, error } = await admin
    .from("feature_flags")
    .select("id, name, enabled, rollout_percentage");

  if (error) {
    console.error("[settings/feature-flags/sync] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load feature flags." }, { status: 500 });
  }

  let updated = 0;
  let unchanged = 0;
  let notFoundInPostHog = 0;
  let lookupErrors = 0;

  for (const flag of flags ?? []) {
    try {
      const state = await getPostHogFlagState(flag.name);
      if (!state) {
        notFoundInPostHog++;
        continue;
      }

      const changed =
        state.active !== flag.enabled || state.rolloutPercentage !== flag.rollout_percentage;
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
    } catch (err) {
      lookupErrors++;
      console.error(
        `[settings/feature-flags/sync] "${flag.name}" lookup failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({
    checked: flags?.length ?? 0,
    updated,
    unchanged,
    notFoundInPostHog,
    lookupErrors,
  });
}
