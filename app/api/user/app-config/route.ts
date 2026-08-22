import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/app-config — public, read-only platform configuration for
 * the mobile app (Gap Analysis Part AI, MA-D5).
 *
 * Returns only safe, non-secret fields from platform_settings so the app
 * stops hardcoding support contacts and the share link. Deliberately open
 * (no auth): the same values are served by the get_public_app_config() RPC
 * and nothing here is sensitive. Degrades to baked-in defaults pre-migration.
 */

const FALLBACKS = {
  platform_name: "4 Our Life",
  support_email: null as string | null,
  support_phone: null as string | null,
  support_whatsapp: null as string | null,
  share_url: "https://4ourlife.com",
  default_language: "en",
};

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("platform_settings")
      .select(
        "platform_name, support_email, support_phone, support_whatsapp, share_url, default_language",
      )
      .eq("id", "global")
      .maybeSingle();

    if (error) {
      console.error("[app-config] Supabase error:", error.message);
      return NextResponse.json({ settings: FALLBACKS });
    }

    return NextResponse.json({
      settings: { ...FALLBACKS, ...(data ?? {}) },
    });
  } catch (err) {
    console.error("[app-config] Unexpected error:", err);
    return NextResponse.json({ settings: FALLBACKS });
  }
}
