import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { getServerClient } from "@/lib/db/server";

// Support ticket triage (Gap Analysis Part E, phase 3). Moves ticket writes
// off the RLS-only client path and enforces chats.moderate (decision E-D3).
const PatchTicketSchema = z
  .object({
    status: z.enum(["Open", "Unread", "Pending", "Resolved", "Escalated"]),
    priority: z.enum(["Low", "Medium", "High"]),
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
  const ticketId = Number(id);
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) {
    return NextResponse.json({ error: "Invalid support ticket." }, { status: 400 });
  }
  const parsed = PatchTicketSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  // Gap Analysis CH-D4 — capture the previous status so a real transition
  // can push a notification to the ticket requester below.
  const { data: previous, error: previousError } = await admin
    .from("chat_support")
    .select("status, requested_by, subject")
    .eq("id", id)
    .maybeSingle();
  if (previousError) {
    console.error("[chat/support/:id PATCH] lookup error:", previousError.message);
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .rpc("update_support_ticket_status", {
      p_ticket_id: ticketId,
      p_status: parsed.data.status ?? null,
      p_priority: parsed.data.priority ?? null,
      p_assigned_to: parsed.data.assignedTo ?? null,
      p_resolution_notes: parsed.data.resolutionNotes ?? null,
      p_update_assignee: parsed.data.assignedTo !== undefined,
      p_update_resolution_notes: parsed.data.resolutionNotes !== undefined,
    })
    .single();

  if (error) {
    console.error("[chat/support/:id PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update ticket." }, { status: 500 });
  }
  const updatedTicket = data as { subject: string | null; status: string };

  // CH-D4 — notify the requester when the ticket status actually changes.
  // Never let a notification failure affect the PATCH response.
  if (
    previous?.requested_by &&
    parsed.data.status &&
    parsed.data.status !== previous.status
  ) {
    try {
      const displayId = `TKT-${String(id).padStart(4, "0")}`;
      await admin.rpc("dispatch_notification", {
        p_recipients: [
          {
            user_id: previous.requested_by,
            title: `Support ticket ${displayId} ${parsed.data.status}`,
            body:
              parsed.data.status === "Resolved"
                ? `Your ticket "${updatedTicket.subject ?? "no subject"}" has been resolved. Let us know how we did!`
                : `Your ticket "${updatedTicket.subject ?? "no subject"}" is now ${parsed.data.status}.`,
            type: "support_ticket",
            metadata: { ticket_id: id, display_id: displayId, status: parsed.data.status },
            channel_id: "support-tickets",
          },
        ],
      });
    } catch (notifyError: any) {
      console.error(
        "[chat/support/:id PATCH] Failed to notify requester:",
        notifyError?.message,
      );
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "update_support_ticket",
    p_target_table: "chat_support",
    p_record_id: id,
    p_description: `Updated ticket TKT-${String(id).padStart(4, "0")} ("${updatedTicket.subject ?? "no subject"}" → ${updatedTicket.status})`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("chats.moderate");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const admin = getAdminClient();

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
