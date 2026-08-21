import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

  const admin = getSupabaseAdmin();
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

  const admin = getSupabaseAdmin();
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

  return NextResponse.json({ flag: data });
}
