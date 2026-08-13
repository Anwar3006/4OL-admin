import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_WRITE_ROLES = ["admin", "super_admin"];

const UpdateSchema = z.object({
  graTaxId: z.string().trim().max(80).optional().nullable(),
  vatRate: z.number().min(0).max(100).optional().nullable(),
  vatFilingFrequency: z.enum(["monthly", "quarterly", "annually"]).optional().nullable(),
  nextFilingDueDate: z.string().date().optional().nullable(),
  lastFiledAt: z.string().date().optional().nullable(),
});

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
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
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (!profile?.role || !ADMIN_WRITE_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Only Admin or Super Admin can update compliance settings." }, { status: 403 });
  }

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
    updated_by: user.id,
  });

  if (error) {
    console.error("[compliance/settings PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update compliance settings." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
