"use server";
import { supabase } from "@/lib/supabase";
import type {
  TAdminInviteSchema,
  TUserProfile,
} from "@/schemas/user-profile.schema";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import sgMail from "@sendgrid/mail";
import { render } from "@react-email/render";
import InviteAdminEmail from "@/components/emails/invite-admin";
import * as React from "react";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

const createAdminInvite = async (input: TAdminInviteSchema) => {
  try {
    const { data, error } = await supabase
      .from("user_invites")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) throw new Error("Invite already sent");

    const { data: result, error: error2 } = await supabase
      .from("user_invites")
      .insert({
        email: input.email,
        role: input.role,
        token: input.token,
        expires_at: input.expires_at,
      })
      .select()
      .single();

    if (error2) throw error2;
    return result;
  } catch (error) {
    throw error;
  }
};

export async function inviteAdminAction(email: string, role: string) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
      headers: {
        cookie: requestHeaders.get("cookie") as string,
      },
    });

    if (session?.user?.role !== "admin") {
      throw new Error(
        "Unauthorized: You do not have permission to invite admins.",
      );
    }

    const token = nanoid(24);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await createAdminInvite({
      email,
      role: role as TUserProfile["role"],
      token,
      expires_at: expiresAt,
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`;

    const html = await render(
      React.createElement(InviteAdminEmail, {
        email,
        inviteLink,
      })
    );

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || "life@4ourlife.com",
      subject: "Invitation to join 4 Our Life",
      html,
    };

    await sgMail.send(msg);

    return {
      data: {
        id: token,
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error sending invitation:", error);

    return {
      data: null,
      error: error.message || "Failed to send invitation",
    };
  }
}
