import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";
import { generatePlatformKey, hashPlatformKey, keyHint } from "@/lib/api-keys";

const GenerateKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.string().trim().min(2).max(40),
  environment: z.enum(["server", "client-public"]).default("server"),
});

/**
 * Generate a platform API key (Part P, P-D2). The plaintext key is returned
 * exactly once — only its SHA-256 hash and a display hint are persisted.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = GenerateKeySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid key payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plaintext = generatePlatformKey();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_api_keys")
    .insert({
      name: parsed.data.name,
      provider: parsed.data.provider,
      environment: parsed.data.environment,
      key_hash: hashPlatformKey(plaintext),
      key_hint: keyHint(plaintext),
      active: true,
    })
    .select("id, name, provider, environment, key_hint, active, created_at")
    .single();

  if (error) {
    console.error("[settings/api-keys/generate] insert error:", error.message);
    return NextResponse.json({ error: "Failed to generate key." }, { status: 500 });
  }

  await logSettingsChange(admin, user.id, "api_keys", `generate:${data.id}`, null, {
    name: data.name,
    provider: data.provider,
  });

  return NextResponse.json({ key: { ...data, plaintext } }, { status: 201 });
}
