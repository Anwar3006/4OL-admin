import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logSettingsChange } from "@/lib/settings-audit";

const PatchWebhookSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    url: z.url().optional(),
    events: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid webhook id." }, { status: 400 });
  }

  const parsed = PatchWebhookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook patch", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.events !== undefined) updates.events = parsed.data.events;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_webhooks")
    .update(updates)
    .eq("id", id)
    .select("id, name, url, events, active")
    .maybeSingle();

  if (error) {
    console.error("[settings/webhooks/[id]] update error:", error.message);
    return NextResponse.json({ error: "Failed to update webhook." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
  }

  await logSettingsChange(admin, user.id, "integrations", `webhook:${id}`, null, updates);

  return NextResponse.json({ webhook: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid webhook id." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("platform_webhooks").delete().eq("id", id);

  if (error) {
    console.error("[settings/webhooks/[id]] delete error:", error.message);
    return NextResponse.json({ error: "Failed to delete webhook." }, { status: 500 });
  }

  await logSettingsChange(admin, user.id, "integrations", `webhook:${id}`, { deleted: true }, null);

  return NextResponse.json({ success: true });
}
