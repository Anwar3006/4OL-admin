import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Anatomy region vocabulary (Gap Analysis Part AL). Read-only — regions are
 * seeded by the 20260823_anatomy_mobile_al migration; camera presets are
 * part of the seed and refined there.
 */
export async function GET() {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("anatomy_regions")
    .select("*")
    .order("display_order");

  if (error) {
    // Migration not applied yet — fail open with an empty vocabulary.
    return NextResponse.json({ regions: [], applied: false });
  }
  return NextResponse.json({ regions: data ?? [], applied: true });
}
