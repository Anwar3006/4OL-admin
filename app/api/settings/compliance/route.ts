import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";

/**
 * Compliance attestations (Gap Analysis Part P, P-D6): GH-DPA registration,
 * GRA tax details, HEFRA licence, encryption posture. Read-heavy; edits are
 * gated behind settings.billing (super_admin only in ROLE_DEFAULTS).
 */
const ComplianceSchema = z.object({
  gh_dpa_registration_no: z.string().trim().max(60).optional(),
  gh_dpa_dpo_name: z.string().trim().max(100).optional(),
  gh_dpa_dpo_email: z.string().trim().email().or(z.literal("")).optional(),
  gh_dpa_retention_policy: z.string().trim().max(500).optional(),
  gra_tin: z.string().trim().max(30).optional(),
  gra_vat_rate: z.coerce.number().min(0).max(100).optional(),
  gra_next_filing_date: z.string().trim().max(20).optional(),
  hefra_license_no: z.string().trim().max(60).optional(),
  hefra_expiry_date: z.string().trim().max(20).optional(),
  encryption_at_rest: z.string().trim().max(80).optional(),
  encryption_in_transit: z.string().trim().max(80).optional(),
  iso27001_status: z.string().trim().max(40).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_settings")
    .select("compliance")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.error("[settings/compliance] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load compliance data." },
      { status: 500 },
    );
  }

  return NextResponse.json({ compliance: data?.compliance ?? {} });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.billing");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = ComplianceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid compliance data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: previous } = await admin
    .from("platform_settings")
    .select("compliance")
    .eq("id", "global")
    .maybeSingle();

  // Merge over the existing attestations — partial saves are allowed.
  const merged = { ...(previous?.compliance ?? {}), ...parsed.data };

  const { data, error } = await admin
    .from("platform_settings")
    .upsert({
      id: "global",
      compliance: merged,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("compliance")
    .single();

  if (error) {
    console.error("[settings/compliance] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update compliance data." },
      { status: 500 },
    );
  }

  await logSettingsChange(
    admin,
    user.id,
    "compliance",
    "compliance",
    previous?.compliance ?? null,
    merged,
  );

  return NextResponse.json({ compliance: data.compliance });
}
