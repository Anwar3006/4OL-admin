import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { deliverProviderInvite } from "@/lib/provider-invite";
import { registerProviderAccountSchema } from "@/features/providers/schema/types";

/**
 * P0-06: create (or branch onto) a provider owner account, create their
 * facility row, and deliver a one-time sign-in link — replacing the old
 * three-round-trip dance of createFacilityOwnerAccount() +
 * useCreateFacilityProfile() + notifyFacilityRegistration(), and its
 * temporary-password-is-the-GPS-address hack.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("providers.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = registerProviderAccountSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const admin = getAdminClient();

  // ── Resolve the owner: existing account (branch) or a brand new one ────
  const { data: existingUserId, error: lookupError } = await admin.rpc(
    "get_user_id_by_email",
    { p_email: input.owner_email },
  );
  if (lookupError) {
    return NextResponse.json({ error: "Failed to check for an existing account." }, { status: 500 });
  }

  let userId = existingUserId as string | null;
  let isNewUser = false;

  if (userId) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("account_types")
      .eq("user_id", userId)
      .maybeSingle();
    const current: string[] = profile?.account_types ?? ["member"];
    if (!current.includes("provider")) {
      await admin
        .from("user_profiles")
        .update({ account_types: [...current, "provider"] })
        .eq("user_id", userId);
    }
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.owner_email,
      email_confirm: true, // no password — the invite link is the credential
      user_metadata: {
        first_name: input.first_name,
        last_name: input.last_name,
        phone_number: input.person_contact_number,
      },
      app_metadata: { account_types: ["provider"] },
    });
    if (createError || !created?.user?.id) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create the account." },
        { status: 500 },
      );
    }
    userId = created.user.id;
    isNewUser = true;
  }

  await admin.from("user_profiles").update({ requires_password_change: true }).eq("user_id", userId);

  // ── Create the facility row (create_provider replaces this in P0-10) ───
  const { data: facility, error: facilityError } = await admin.rpc("register_facility_with_profile", {
    p_admin_id: auth.user.id,
    p_owner_id: userId,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_phone_number: input.person_contact_number,
    p_facility_data: input,
  });
  if (facilityError || !facility?.id) {
    return NextResponse.json(
      {
        error: facilityError?.message ?? "Account was created but the facility could not be registered.",
        userId,
      },
      { status: 500 },
    );
  }

  const deliveries = await deliverProviderInvite({
    userId,
    providerId: facility.id,
    facilityName: input.facility_name,
    email: input.owner_email,
    phone: input.person_contact_number,
    whatsapp: input.whatsapp_number,
  });

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "provider_registered",
    target_table: "facility_profile",
    record_id: facility.id,
    new_data: { facility_name: input.facility_name, owner_id: userId, is_new_user: isNewUser },
  });

  return NextResponse.json(
    { userId, isNewUser, providerId: facility.id, deliveries },
    { status: 201 },
  );
}
