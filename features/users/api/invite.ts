import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Invite a platform user (mockup `m-invite-user`). Creates a user_invites
// row and returns the accept link; SMS/email dispatch hooks into the same
// row when providers are wired.

const InviteUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  plan: z.enum(["free", "standard", "premium", "featured"]).default("free"),
  region: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = InviteUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invite payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  // Same existence check the admin invite flow uses (email lives in auth.users).
  const { data: userExists, error: userError } = await admin.rpc(
    "auth_user_exists_by_email",
    { p_email: parsed.data.email },
  );
  if (userError) {
    return NextResponse.json(
      { error: "Failed to verify email availability." },
      { status: 500 },
    );
  }
  if (userExists) {
    return NextResponse.json(
      { error: "A user with this email already has an account." },
      { status: 409 },
    );
  }

  // user_invites.email is unique — reuse stale rows instead of double-inserting.
  const { data: existing } = await admin
    .from("user_invites")
    .select("id, used_at, is_revoked, expires_at")
    .eq("email", parsed.data.email)
    .maybeSingle();

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const payload = {
    role: "user",
    token,
    expires_at: expiresAt,
    invited_by: auth.user.id,
  };

  const isActive =
    existing &&
    !existing.used_at &&
    !existing.is_revoked &&
    new Date(existing.expires_at) > new Date();
  if (isActive) {
    return NextResponse.json(
      { error: "An invite has already been sent to this email." },
      { status: 409 },
    );
  }

  const { data: invite, error } = existing
    ? await admin
        .from("user_invites")
        .update({
          ...payload,
          created_at: new Date().toISOString(),
          used_at: null,
          used_by: null,
          is_revoked: false,
          revoked_at: null,
          revoked_by: null,
        })
        .eq("id", existing.id)
        .select("id, token")
        .single()
    : await admin
        .from("user_invites")
        .insert({ email: parsed.data.email, ...payload })
        .select("id, token")
        .single();

  if (error || !invite) {
    console.error("[admin/users/invite] Supabase error:", error?.message);
    return NextResponse.json({ error: "Failed to create invite." }, { status: 500 });
  }

  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "user_invited",
    target_table: "user_invites",
    new_data: {
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      plan: parsed.data.plan,
      region: parsed.data.region ?? null,
      note: parsed.data.note ?? null,
    },
  });

  return NextResponse.json(
    {
      success: true,
      inviteId: invite.id,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite?token=${token}`,
    },
    { status: 201 },
  );
}
