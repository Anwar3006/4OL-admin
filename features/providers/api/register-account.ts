import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { deliverProviderInvite } from "@/lib/provider-invite";
import { registerProviderAccountSchema } from "@/features/providers/schema/types";

const PROVIDER_MEDIA_BUCKET = "provider-media";

const isAbsoluteUrl = (value: string) => /^https?:\/\//.test(value);

/**
 * A registrar creates a provider before its provider ID is known, so their
 * browser uploads into provider-media/pending/<session>. Once the row exists,
 * move each object under the same provider root used by the business app
 * (<provider-id>/...). The database only receives public provider-media URLs.
 */
async function finalizeRegistrationMedia(input: {
  admin: ReturnType<typeof getAdminClient>;
  providerId: string;
  mediaUrls: string[];
  featuredImageUrl?: string;
}) {
  const movedUrls = new Map<string, string>();

  for (const sourcePath of input.mediaUrls) {
    if (isAbsoluteUrl(sourcePath)) {
      movedUrls.set(sourcePath, sourcePath);
      continue;
    }

    if (!sourcePath.startsWith("pending/")) {
      throw new Error(`Unexpected provider-media path: ${sourcePath}`);
    }

    const filename = sourcePath.split("/").at(-1);
    if (!filename) throw new Error("A provider photo is missing its filename.");

    const targetPath = `${input.providerId}/registrar/${filename}`;
    const { error: moveError } = await input.admin.storage
      .from(PROVIDER_MEDIA_BUCKET)
      .move(sourcePath, targetPath);
    if (moveError) throw new Error(moveError.message);

    const { data } = input.admin.storage
      .from(PROVIDER_MEDIA_BUCKET)
      .getPublicUrl(targetPath);
    movedUrls.set(sourcePath, data.publicUrl);
  }

  const mediaUrls = input.mediaUrls.map((url) => movedUrls.get(url) ?? url);
  const featuredImageUrl = input.featuredImageUrl
    ? movedUrls.get(input.featuredImageUrl) ?? input.featuredImageUrl
    : mediaUrls[0] ?? null;

  const { error: updateError } = await input.admin
    .from("providers")
    .update({ media_urls: mediaUrls, featured_image_url: featuredImageUrl })
    .eq("id", input.providerId);
  if (updateError) throw new Error(updateError.message);
}

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

  // Do this before the provider receives their invite so every consumer and
  // business view sees one canonical provider-media gallery from first login.
  // A storage outage must not make the account impossible to access; it is
  // returned as an actionable warning while the row retains the pending URLs.
  let mediaWarning: string | undefined;
  if (input.media_urls.length > 0) {
    try {
      await finalizeRegistrationMedia({
        admin,
        providerId: facility.id,
        mediaUrls: input.media_urls,
        featuredImageUrl: input.featured_image_url,
      });
    } catch (error) {
      console.error("Unable to finalize provider registration media", error);
      mediaWarning = "The provider was registered, but their photos could not be finalized. Please open the facility and save its photos again.";
    }
  }

  const registrationCapabilities = input.registration_capabilities ?? [];
  if (registrationCapabilities.length > 0) {
    const { error: capabilitiesError } = await admin.rpc(
      "capture_provider_registration_capabilities",
      {
        p_provider_id: facility.id,
        p_capabilities: registrationCapabilities,
        p_captured_by: auth.user.id,
        p_source: "registrar",
      },
    );
    if (capabilitiesError) {
      return NextResponse.json(
        {
          error: `Provider was registered, but captured capabilities could not be saved: ${capabilitiesError.message}`,
          userId,
          providerId: facility.id,
        },
        { status: 500 },
      );
    }
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
    { userId, isNewUser, providerId: facility.id, deliveries, mediaWarning },
    { status: 201 },
  );
}
