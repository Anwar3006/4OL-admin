import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";
import { upsertPostHogFlag } from "@/lib/posthog-admin";

const FeatureFlagSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  enabled: z.boolean(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("feature_flags")
    .select("id, name, description, enabled, rollout_percentage, updated_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[settings/feature-flags] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load feature flags." },
      { status: 500 },
    );
  }

  return NextResponse.json({ flags: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = FeatureFlagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feature flag", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  const { data: previous } = await admin
    .from("feature_flags")
    .select("enabled, rollout_percentage")
    .eq(parsed.data.id ? "id" : "name", parsed.data.id ?? parsed.data.name)
    .maybeSingle();

  const { data, error } = await admin
    .from("feature_flags")
    .upsert({
      ...parsed.data,
      rollout_percentage: parsed.data.rollout_percentage ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select("id, name, description, enabled, rollout_percentage, updated_at")
    .single();

  if (error) {
    console.error("[settings/feature-flags] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update feature flag." },
      { status: 500 },
    );
  }

  await logSettingsChange(admin, auth.user.id, "feature_flags", data.name, previous, {
    enabled: data.enabled,
    rollout_percentage: data.rollout_percentage,
  });

  // PostHog is the actual flag-evaluation engine; this table is the super
  // admin's mirror. Push the change there too, but never let a PostHog
  // failure block the local save — "not something that requires
  // strictness." The pull-sync cron (/api/settings/feature-flags/sync)
  // reconciles drift either way.
  let posthogSynced = false;
  let posthogError: string | undefined;
  try {
    await upsertPostHogFlag({
      key: data.name,
      name: data.name,
      description: data.description,
      active: data.enabled,
      rolloutPercentage: data.rollout_percentage,
    });
    posthogSynced = true;
  } catch (err) {
    posthogError = err instanceof Error ? err.message : "Unknown PostHog error";
    console.warn("[settings/feature-flags] PostHog sync skipped:", posthogError);
  }

  return NextResponse.json({ flag: data, posthogSynced, posthogError });
}
