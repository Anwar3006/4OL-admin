import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UpdateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const parsed = UpdateTemplateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("notification_templates")
    .update({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.subject !== undefined && { subject: parsed.data.subject }),
      ...(parsed.data.body !== undefined && { body: parsed.data.body }),
      ...(parsed.data.isActive !== undefined && { is_active: parsed.data.isActive }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[notifications/templates/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update template." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("notification_templates").delete().eq("id", id);

  if (error) {
    console.error("[notifications/templates/:id DELETE] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to delete template." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
