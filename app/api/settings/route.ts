import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SettingsSchema = z.object({
  platform_name: z.string().trim().min(1).max(100).optional(),
  support_email: z.string().trim().email().or(z.literal("")).optional(),
  support_phone: z.string().trim().max(30).optional(),
  default_language: z.enum(["en", "twi", "ga"]).optional(),
});

const defaults = {
  id: "global",
  platform_name: "4 Our Life",
  support_email: "support@4ourlife.com",
  support_phone: "",
  default_language: "en",
};

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_settings")
    .select("id, platform_name, support_email, support_phone, default_language")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.error("[settings] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load platform settings." },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings: data ?? defaults });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = SettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_settings")
    .upsert({
      id: "global",
      ...parsed.data,
      support_email: parsed.data.support_email || null,
      updated_at: new Date().toISOString(),
    })
    .select("id, platform_name, support_email, support_phone, default_language")
    .single();

  if (error) {
    console.error("[settings] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update platform settings." },
      { status: 500 },
    );
  }

  return NextResponse.json({ settings: data });
}
