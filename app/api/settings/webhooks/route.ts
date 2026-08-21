import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";

const WebhookSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.url(),
  events: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  active: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_webhooks")
    .select(
      "id, name, url, events, active, last_delivery_at, last_delivery_status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[settings/webhooks] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load webhooks." },
      { status: 500 },
    );
  }

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = WebhookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_webhooks")
    .insert({
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      active: parsed.data.active,
      created_by: user.id,
    })
    .select("id, name, url, events, active, created_at")
    .single();

  if (error) {
    console.error("[settings/webhooks] insert error:", error.message);
    return NextResponse.json({ error: "Failed to create webhook." }, { status: 500 });
  }

  await logSettingsChange(admin, user.id, "integrations", `webhook:${data.id}`, null, {
    name: data.name,
    url: data.url,
  });

  return NextResponse.json({ webhook: data }, { status: 201 });
}
