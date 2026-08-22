/**
 * /api/medenquiry/[id]/broadcast
 * Gap Analysis Part AB: broadcast an unmatched enquiry to more pharmacies.
 *
 * POST → medenquiry.manage — creates a med_enquiry_broadcast campaign row in
 * pharmacy_campaigns for pharmacies in the submitter's region (capped at 25),
 * reusing the Part B pharmacy-marketing infrastructure. Falls back to an
 * audit-only broadcast if no pharmacy profiles are available.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const BROADCAST_CAP = 25;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("medenquiry.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid enquiry id" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: enquiry, error: fetchError } = await admin
      .from("medication_enquiries")
      .select(
        `id, medication_name, dosage, quantity, status,
         user:user_profiles!medication_enquiries_user_id_fkey(region)`,
      )
      .eq("id", id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (enquiry.status !== "pending_match") {
      return NextResponse.json({ error: "Only pending/unmatched enquiries can be broadcast" }, { status: 422 });
    }

    const userEmbed = enquiry?.user as unknown as { region?: string } | { region?: string }[] | null;
    const region = Array.isArray(userEmbed)
      ? userEmbed[0]?.region ?? null
      : userEmbed?.region ?? null;
    let pharmacyQuery = admin
      .from("facility_profile")
      .select("id")
      .ilike("facility_type", "%pharmacy%")
      .limit(BROADCAST_CAP);
    if (region) pharmacyQuery = pharmacyQuery.eq("region", region);

    const { data: pharmacies } = await pharmacyQuery;
    const targets = pharmacies ?? [];

    if (targets.length) {
      const campaigns = targets.map((p) => ({
        pharmacy_id: p.id,
        title: `Availability request: ${enquiry.medication_name}`,
        description: `A user is looking for ${enquiry.medication_name}${
          enquiry.dosage ? ` ${enquiry.dosage}` : ""
        } (qty ${enquiry.quantity ?? 1}). Respond with price & availability in Medication Enquiry.`,
        campaign_type: "med_enquiry_broadcast",
        target_regions: region ? [region] : [],
        target_medications: [enquiry.medication_name],
      }));
      const { error: insertError } = await admin.from("pharmacy_campaigns").insert(campaigns);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    await admin.from("activity_logs").insert({
      actor_id: auth.user.id,
      actor_name: auth.role,
      action_type: "medenquiry.broadcast",
      target_table: "medication_enquiries",
      new_data: { enquiry_id: id, region, pharmacies_notified: targets.length },
    });

    return NextResponse.json({ ok: true, pharmacies_notified: targets.length });
  } catch {
    return NextResponse.json({ error: "Failed to broadcast enquiry" }, { status: 500 });
  }
}
