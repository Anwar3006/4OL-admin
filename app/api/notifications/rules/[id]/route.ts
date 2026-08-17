import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UpdateRuleSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const parsed = UpdateRuleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("notification_automation_rules")
    .update({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.isActive !== undefined && { is_active: parsed.data.isActive }),
    })
    .eq("id", id);

  if (error) {
    console.error("[notifications/rules/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update rule." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("notification_automation_rules").delete().eq("id", id);

  if (error) {
    console.error("[notifications/rules/:id DELETE] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to delete rule." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
