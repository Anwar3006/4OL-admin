import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";
import { generatePlatformKey, hashPlatformKey, keyHint } from "@/lib/api-keys";

const RotateKeySchema = z.object({ id: z.uuid() });

/**
 * Rotate a platform API key (Part P, P-D2): the old key is deactivated and
 * a new one is issued in its place, linked via rotated_from_id. The new
 * plaintext is shown exactly once.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = RotateKeySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rotate payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: existing, error: findError } = await admin
    .from("platform_api_keys")
    .select("id, name, provider, environment, active")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (findError) {
    console.error("[settings/api-keys/rotate] select error:", findError.message);
    return NextResponse.json({ error: "Failed to rotate key." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Key not found." }, { status: 404 });
  }

  const plaintext = generatePlatformKey();
  const { data, error } = await admin
    .from("platform_api_keys")
    .insert({
      name: existing.name,
      provider: existing.provider,
      environment: existing.environment,
      key_hash: hashPlatformKey(plaintext),
      key_hint: keyHint(plaintext),
      active: true,
      rotated_from_id: existing.id,
    })
    .select("id, name, provider, environment, key_hint, active, created_at")
    .single();

  if (error) {
    console.error("[settings/api-keys/rotate] insert error:", error.message);
    return NextResponse.json({ error: "Failed to rotate key." }, { status: 500 });
  }

  await admin
    .from("platform_api_keys")
    .update({ active: false, revoked_at: new Date().toISOString() })
    .eq("id", existing.id);

  await logSettingsChange(
    admin,
    user.id,
    "api_keys",
    `rotate:${existing.id}`,
    { active: true },
    { replaced_by: data.id },
  );

  return NextResponse.json({ key: { ...data, plaintext } }, { status: 201 });
}
