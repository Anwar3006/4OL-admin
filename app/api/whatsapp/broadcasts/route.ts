import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * WhatsApp broadcast queue (Gap Analysis Part T, T-D4). Queue-time
 * enforcement: a broadcast can only reference a Meta-approved template —
 * no approved template, no send. whatsapp.broadcast is super_admin-only in
 * ROLE_DEFAULTS, matching the mockup's Super-Admin command card.
 */
const CreateBroadcastSchema = z.object({
  name: z.string().trim().min(1).max(160),
  templateId: z.uuid(),
  groupId: z.uuid().optional().nullable(),
  audienceFilter: z.record(z.string(), z.unknown()).default({}),
  message: z.string().trim().min(1).max(1024),
  mediaUrl: z.url().optional().nullable(),
  scheduledAt: z.iso.datetime().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("whatsapp.broadcast");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateBroadcastSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid broadcast", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  // T-D4: only Meta-approved templates may be queued.
  const { data: template, error: templateError } = await admin
    .from("whatsapp_templates")
    .select("id, status")
    .eq("id", parsed.data.templateId)
    .maybeSingle();

  if (templateError) {
    console.error("[whatsapp/broadcasts POST] Supabase error:", templateError.message);
    return NextResponse.json({ error: "Failed to verify template." }, { status: 500 });
  }
  if (!template || template.status !== "approved") {
    return NextResponse.json(
      { error: "Only Meta-approved templates can be broadcast. Custom templates need 24h approval first." },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("whatsapp_broadcasts")
    .insert({
      name: parsed.data.name,
      template_id: parsed.data.templateId,
      group_id: parsed.data.groupId ?? null,
      audience_filter: parsed.data.audienceFilter,
      message: parsed.data.message,
      media_url: parsed.data.mediaUrl ?? null,
      scheduled_at: parsed.data.scheduledAt ?? null,
      status: parsed.data.scheduledAt ? "scheduled" : "queued",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[whatsapp/broadcasts POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to queue broadcast." }, { status: 500 });
  }

  return NextResponse.json({ broadcast: data }, { status: 201 });
}
