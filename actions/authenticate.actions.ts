"use server";
import { supabase } from "@/lib/supabase";
import type {
  TAdminInviteSchema,
  TUserProfile,
} from "@/schemas/user-profile.schema";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Invitation to join 4 Our Life</h2>
        <p>Hello,</p>
        <p>You have been invited to join the 4 Our Life admin dashboard.</p>
        <p>
          <a href="${inviteLink}" target="_blank" rel="noopener noreferrer">
            Accept Invitation
          </a>
        </p>
        <p>This link expires in 7 days.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "4OurLife <onboarding@resend.dev>",
      to: email,
      subject: "Invitation to join 4 Our Life",
      html,
    });

    return {
      data: {
        id: result.data?.id || token,
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
