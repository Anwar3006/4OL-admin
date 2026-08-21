import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";

const RevokeKeySchema = z.object({ id: z.uuid() });

/** Revoke a platform API key (Part P). Irreversible — the UI confirms first. */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = RevokeKeySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid revoke payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_api_keys")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id, name, provider, active")
    .maybeSingle();

  if (error) {
    console.error("[settings/api-keys/revoke] update error:", error.message);
    return NextResponse.json({ error: "Failed to revoke key." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Key not found." }, { status: 404 });
  }

  await logSettingsChange(
    admin,
    user.id,
    "api_keys",
    `revoke:${data.id}`,
    { active: true },
    { active: false },
  );

  return NextResponse.json({ success: true, key: data });
}
