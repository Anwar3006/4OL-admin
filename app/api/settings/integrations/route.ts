import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const IntegrationSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(100),
  provider: z.enum([
    "google",
    "twilio",
    "resend",
    "paystack",
    "momo",
    "gemini",
    "firebase",
    "openai",
    "supabase",
    "github",
  ]),
  status: z.enum(["connected", "disconnected", "error", "pending"]),
  webhook_url: z.url().or(z.literal("")).optional(),
});

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_integrations")
    .select("id, name, provider, status, webhook_url, updated_at")
    .order("provider", { ascending: true });

  if (error) {
    console.error("[settings/integrations] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load integrations." },
      { status: 500 },
    );
  }

  return NextResponse.json({ integrations: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("integrations.keys");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = IntegrationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid integration", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_integrations")
    .upsert({
      ...parsed.data,
      webhook_url: parsed.data.webhook_url || null,
      updated_at: new Date().toISOString(),
    })
    .select("id, name, provider, status, webhook_url, updated_at")
    .single();

  if (error) {
    console.error("[settings/integrations] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update integration." },
      { status: 500 },
    );
  }

  return NextResponse.json({ integration: data });
}
