import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const UpdateSchema = z.object({
  graTaxId: z.string().trim().max(80).optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
  vatFilingFrequency: z.enum(["monthly", "quarterly", "annually"]).optional().nullable(),
  nextFilingDueDate: z.string().date().optional().nullable(),
  lastFiledAt: z.string().date().optional().nullable(),
});

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("compliance_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("[compliance/settings GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load compliance settings." }, { status: 500 });
  }

  return NextResponse.json({
    settings: data ?? {
      gra_tax_id: null,
      vat_rate: null,
      vat_filing_frequency: null,
      next_filing_due_date: null,
      last_filed_at: null,
      updated_at: null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  // GRA/VAT compliance writes are billing-tier: settings.billing is held only
  // by super_admin in ROLE_DEFAULTS (Part P least-privilege split).
  const auth = await requireAdminApiUser("settings.billing");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await admin.from("compliance_settings").upsert({
    id: "default",
    ...(parsed.data.graTaxId !== undefined && { gra_tax_id: parsed.data.graTaxId }),
    ...(parsed.data.vatRate !== undefined && { vat_rate: parsed.data.vatRate }),
    ...(parsed.data.vatFilingFrequency !== undefined && { vat_filing_frequency: parsed.data.vatFilingFrequency }),
    ...(parsed.data.nextFilingDueDate !== undefined && { next_filing_due_date: parsed.data.nextFilingDueDate }),
    ...(parsed.data.lastFiledAt !== undefined && { last_filed_at: parsed.data.lastFiledAt }),
    updated_by: auth.user.id,
  });

  if (error) {
    console.error("[compliance/settings PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update compliance settings." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
