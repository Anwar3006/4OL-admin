import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CreateRuleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  triggerEvent: z.string().trim().min(1).max(80),
  sourceModule: z.string().trim().min(1).max(60),
  channel: z.array(z.string()).default([]),
  targetAudience: z.string().trim().max(80).optional().nullable(),
  conditionJson: z.record(z.string(), z.unknown()).default({}),
  templateId: z.uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateRuleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rule", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("notification_automation_rules")
    .insert({
      name: parsed.data.name,
      trigger_event: parsed.data.triggerEvent,
      source_module: parsed.data.sourceModule,
      channel: parsed.data.channel,
      target_audience: parsed.data.targetAudience ?? null,
      condition_json: parsed.data.conditionJson,
      template_id: parsed.data.templateId ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[notifications/rules POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create automation rule." }, { status: 500 });
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}
