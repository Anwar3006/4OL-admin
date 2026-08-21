import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Support ticket triage (Gap Analysis Part E, phase 3). Moves ticket writes
// off the RLS-only client path and enforces chats.moderate (decision E-D3).
const PatchTicketSchema = z
  .object({
    status: z.enum(["Open", "Unread", "Pending", "Resolved", "Escalated"]),
    assignedTo: z.uuid().nullable(),
    resolutionNotes: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Empty payload" });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("chats.moderate");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const parsed = PatchTicketSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const now = new Date().toISOString();

  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    if (parsed.data.status === "Resolved") {
      updates.resolved_at = now;
      updates.resolved_by = user.id;
    }
    if (parsed.data.status === "Escalated") {
      updates.escalated_at = now;
    }
  }
  if (parsed.data.assignedTo !== undefined) {
    updates.assigned_to = parsed.data.assignedTo;
    updates.assigned_at = parsed.data.assignedTo ? now : null;
  }
  if (parsed.data.resolutionNotes !== undefined) {
    updates.resolution_notes = parsed.data.resolutionNotes;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("chat_support")
    .update(updates)
    .eq("id", id)
    .select("id, subject, status")
    .single();

  if (error) {
    console.error("[chat/support/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update ticket." }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "update_support_ticket",
    p_target_table: "chat_support",
    p_record_id: id,
    p_description: `Updated ticket TKT-${String(id).padStart(4, "0")} ("${data.subject ?? "no subject"}" → ${data.status})`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("chats.moderate");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const admin = getSupabaseAdmin();

  // Soft delete — mirrors the mobile-side is_deleted convention.
  const { error } = await admin
    .from("chat_support")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[chat/support/:id DELETE] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to delete ticket." }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "delete_support_ticket",
    p_target_table: "chat_support",
    p_record_id: id,
    p_description: `Deleted ticket TKT-${String(id).padStart(4, "0")}`,
  });

  return NextResponse.json({ success: true });
}
