import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DRUG_AVAILABILITY, DRUG_CATEGORIES, DRUG_STATUSES } from "@/lib/shared-constants";

const PatchDrugSchema = z.object({
  name: z.string().trim().min(2).max(240).optional(),
  generic_name: z.string().trim().max(240).nullable().optional(),
  category: z.enum(DRUG_CATEGORIES).nullable().optional(),
  availability: z.enum(DRUG_AVAILABILITY).optional(),
  dosage_form: z.string().trim().max(80).nullable().optional(),
  strength: z.string().trim().max(60).nullable().optional(),
  strength_unit: z.string().trim().max(20).nullable().optional(),
  pack_size: z.number().int().positive().max(100000).nullable().optional(),
  manufacturer: z.string().trim().max(160).nullable().optional(),
  active_ingredients: z.array(z.string().trim().min(1).max(160)).max(40).optional(),
  conditions_treated: z.array(z.string().trim().min(1).max(160)).max(40).optional(),
  atc_code: z.string().trim().max(20).nullable().optional(),
  status: z.enum(DRUG_STATUSES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid drug id" }, { status: 400 });
  }

  const parsed = PatchDrugSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid drug patch", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("drugs")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[medication/drugs/[id]] patch error:", error.message);
    return NextResponse.json({ error: "Failed to update drug." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Drug not found." }, { status: 404 });
  }

  return NextResponse.json({ drug: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid drug id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("drugs").delete().eq("id", id);

  if (error) {
    console.error("[medication/drugs/[id]] delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete drug." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
