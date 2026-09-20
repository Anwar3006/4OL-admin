import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { deliverProviderInvite } from "@/lib/provider-invite";

/** Re-sends the sign-in link for an existing provider — a fresh magic link each time (see lib/provider-invite.ts). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();

  const { data: facility, error } = await admin
    .from("facility_profile")
    .select("id, owner_id, facility_name, owner_email, person_contact_number, whatsapp_number")
    .eq("id", id)
    .maybeSingle();

  if (error || !facility) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const deliveries = await deliverProviderInvite({
    userId: facility.owner_id,
    providerId: facility.id,
    facilityName: facility.facility_name,
    email: facility.owner_email,
    phone: facility.person_contact_number,
    whatsapp: facility.whatsapp_number,
  });

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "provider_invite_resent",
    target_table: "facility_profile",
    record_id: facility.id,
    new_data: { facility_name: facility.facility_name },
  });

  return NextResponse.json({ deliveries });
}
