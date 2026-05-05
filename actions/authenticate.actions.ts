"use server";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  TAdminInviteSchema,
  TUserProfile,
} from "@/schemas/user-profile.schema";
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
const createAdminInvite = async (input: TAdminInviteSchema) => {
  const admin = getSupabaseAdmin();

  // Check for existing invite
  const { data: existing, error: checkError } = await admin
    .from("user_invites")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message);
  if (existing) throw new Error("An invite has already been sent to this email.");

  const { data: result, error: insertError } = await admin
    .from("user_invites")
    .insert({
      email: input.email,
      role: input.role,
      token: input.token,
      expires_at: input.expires_at,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return result;
};

// ── inviteAdminAction ─────────────────────────────────────────────────────────
export async function inviteAdminAction(email: string, role: string) {
  try {
    const sessionUser = await getSessionUserWithRole();

    if (!sessionUser) {
      throw new Error("Unauthorized: You must be logged in.");
    }

    // Only super_admin or admin can send invites
    const allowedRoles = ["super_admin", "admin"];
    if (!allowedRoles.includes(sessionUser.profileRole)) {
      throw new Error(
        "Unauthorized: You do not have permission to invite admins.",
      );
    }

    const token = nanoid(24);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    await createAdminInvite({
      email,
      role: role as TUserProfile["role"],
      token,
      expires_at: expiresAt,
    });

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

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || "life@4ourlife.com",
      subject: "Invitation to join 4 Our Life",
      html,
    });

    return { data: { id: token }, error: null };
  } catch (error: any) {
    console.error("[inviteAdminAction] Error:", error);
    return { data: null, error: error.message || "Failed to send invitation" };
  }
}
