"use server";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { TAdminInviteSchema } from "@/schemas/user-profile.schema";
import { nanoid } from "nanoid";
import sgMail from "@sendgrid/mail";
import { render } from "@react-email/render";
import InviteAdminEmail from "@/components/emails/invite-admin";
import * as React from "react";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

// ── helper: get authed user + their profile role ──────────────────────────────
async function getSessionUserWithRole() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return profile ? { ...user, profileRole: profile.role } : null;
}

// ── createAdminInvite — uses admin client, safe in server actions ─────────────
// user_invites.email has a unique constraint (one row per email, ever), so a
// resend after the original expired or was revoked has to UPDATE that row in
// place, not insert a new one -- only a still-ACTIVE invite should block a
// new attempt. A row from a send that never actually went out shouldn't be
// able to permanently occupy an email either; see the rollback in
// inviteAdminAction below.
const createAdminInvite = async (
  input: TAdminInviteSchema & { invited_by?: string },
) => {
  const admin = getSupabaseAdmin();

  // 1. Check if an account already exists for this email.
  //
  // This used to read the BetterAuth `user` table, which stopped being written
  // to in March and holds 2 stale rows against the real user base — so the
  // check never matched and duplicate invites went out to people who already
  // had accounts. user_profiles can't answer it either (no email column);
  // email lives only in auth.users, hence the SECURITY DEFINER RPC.
  const { data: userExists, error: userError } = await admin.rpc(
    "auth_user_exists_by_email",
    { p_email: input.email },
  );

  if (userError)
    throw new Error("Error checking existing user: " + userError.message);
  if (userExists)
    throw new Error("A user with this email already has an account.");

  // 2. Check for an existing invite row (unique per email regardless of status)
  const { data: existingInvite, error: checkError } = await admin
    .from("user_invites")
    .select("id, used_at, is_revoked, expires_at")
    .eq("email", input.email)
    .maybeSingle();

  if (checkError)
    throw new Error("Error checking existing invites: " + checkError.message);

  if (existingInvite) {
    const isActive =
      !existingInvite.used_at &&
      !existingInvite.is_revoked &&
      new Date(existingInvite.expires_at) > new Date();

    if (isActive) {
      throw new Error("An invite has already been sent to this email.");
    }

    // Stale (expired/revoked) row for this email — resend by overwriting it
    // in place rather than inserting, since email is unique.
    const { data: result, error: updateError } = await admin
      .from("user_invites")
      .update({
        role: input.role,
        token: input.token,
        expires_at: input.expires_at,
        invited_by: input.invited_by,
        created_at: new Date().toISOString(),
        used_at: null,
        used_by: null,
        is_revoked: false,
        revoked_at: null,
        revoked_by: null,
      })
      .eq("id", existingInvite.id)
      .select()
      .single();

    if (updateError)
      throw new Error("Failed to update invite record: " + updateError.message);
    return result;
  }

  const { data: result, error: insertError } = await admin
    .from("user_invites")
    .insert({
      email: input.email,
      role: input.role,
      token: input.token,
      expires_at: input.expires_at,
      invited_by: input.invited_by,
    })
    .select()
    .single();

  if (insertError)
    throw new Error("Failed to create invite record: " + insertError.message);
  return result;
};

// ── inviteAdminAction ─────────────────────────────────────────────────────────
export async function inviteAdminAction(email: string, role: string) {
  try {
    console.log(`[inviteAdminAction] Starting invite for ${email} as ${role}`);
    const sessionUser = await getSessionUserWithRole();

    if (!sessionUser) {
      console.log("[inviteAdminAction] No session user found");
      throw new Error("Unauthorized: You must be logged in.");
    }

    console.log(
      `[inviteAdminAction] Authenticated as ${sessionUser.email} (Role: ${sessionUser.profileRole})`,
    );

    // Only super_admin or admin can send invites
    const allowedRoles = ["super_admin", "admin"];
    if (!allowedRoles.includes(sessionUser.profileRole)) {
      console.log(
        `[inviteAdminAction] Role ${sessionUser.profileRole} not allowed to invite`,
      );
      throw new Error(
        "Unauthorized: You do not have permission to invite admins.",
      );
    }

    const token = nanoid(24);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    const invite = await createAdminInvite({
      email,
      role: role as TAdminInviteSchema["role"],
      token,
      expires_at: expiresAt,
      invited_by: sessionUser.id,
    });

    // From here on, any failure means the invite was never actually
    // delivered -- roll the row back so it doesn't sit there blocking every
    // future attempt for this email (user_invites.email is unique). Without
    // this, a SendGrid outage or misconfiguration on the FIRST attempt
    // permanently occupies the email until someone manually deletes the row.
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        throw new Error(
          "NEXT_PUBLIC_APP_URL is not set. Cannot generate invite link.",
        );
      }

      const inviteLink = `${appUrl}/accept-invite?token=${token}`;

      const html = await render(
        React.createElement(InviteAdminEmail, { email, inviteLink }),
      );

      console.log(`[inviteAdminAction] Sending email via SendGrid to ${email}`);
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "life@4ourlife.com",
        subject: "Invitation to join 4 Our Life",
        html,
      });
      console.log(`[inviteAdminAction] Email sent successfully to ${email}`);
    } catch (sendError: any) {
      const admin = getSupabaseAdmin();
      await admin.from("user_invites").delete().eq("id", invite.id);

      console.error(
        "[inviteAdminAction] Send failed, invite rolled back:",
        JSON.stringify(sendError, null, 2),
      );
      if (sendError.code === 401) {
        throw new Error(
          "Email service authentication failed. Please contact support.",
        );
      }
      throw new Error(
        "Failed to send invitation email: " +
          (sendError.message || "Unknown error"),
      );
    }

    return { data: { id: token }, error: null };
  } catch (error: any) {
    console.error("[inviteAdminAction] Final Error:", error.message);
    return { data: null, error: error.message || "Failed to send invitation" };
  }
}
