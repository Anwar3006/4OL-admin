"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Creates a Supabase Auth account for a facility owner.
 *
 * - If the email is already registered, returns the existing user's ID
 *   (idempotent — safe to call on retry).
 * - Sets email_confirm: true so the account is immediately usable.
 * - Passes profile metadata so the handle_new_user trigger populates
 *   user_profiles automatically.
 * - Marks requires_password_change: true so the owner is forced to set
 *   a real password on first login.
 *
 * Returns: { userId, isNewUser, error }
 */
export async function createFacilityOwnerAccount(payload: {
  email: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}): Promise<{ userId: string | null; isNewUser: boolean; error: string | null }> {
  // Guard: only admins/super_admins may call this action
  const supabase = await getSupabaseServerClient();
  const { data: { user: caller } } = await supabase.auth.getUser();

  if (!caller?.id) {
    return { userId: null, isNewUser: false, error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();

  const { data: callerProfile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (!["super_admin", "admin"].includes(callerProfile?.role ?? "")) {
    return { userId: null, isNewUser: false, error: "Unauthorized: Admin access required" };
  }

  // ── Try to create the account ─────────────────────────────────────────────
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.temporaryPassword,
    email_confirm: true, // no confirmation email — we send credentials manually
    user_metadata: {
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_number: payload.phoneNumber,
      role: "user",
      user_type: "business_provider",
    },
  });

  if (!createError && newUser?.user?.id) {
    // New user created — force password change on first login
    await admin
      .from("user_profiles")
      .update({
        requires_password_change: true,
        user_type: "facility_owner",
      })
      .eq("user_id", newUser.user.id);

    return { userId: newUser.user.id, isNewUser: true, error: null };
  }

  // ── Handle "already registered" — look up the existing user ──────────────
  if (createError?.message?.toLowerCase().includes("already")) {
    const { data: existingUsers, error: listError } =
      await admin.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      return { userId: null, isNewUser: false, error: listError.message };
    }

    const existing = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === payload.email.trim().toLowerCase(),
    );

    if (existing?.id) {
      return { userId: existing.id, isNewUser: false, error: null };
    }

    return {
      userId: null,
      isNewUser: false,
      error: "Account already exists but could not be resolved.",
    };
  }

  return {
    userId: null,
    isNewUser: false,
    error: createError?.message ?? "Unknown error creating account",
  };
}
