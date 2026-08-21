import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// IBP lifecycle actions (Gap Analysis Part C): verify/reject/suspend/
// reinstate run under ibp.edit; permanent removal needs ibp.delete.

const IbpActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("reinstate") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ibp.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const parsed = IbpActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid IBP action", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { action } = parsed.data;

  let update: Record<string, unknown>;
  switch (action) {
    case "verify":
      update = {
        status: "active",
        verified_at: now,
        verified_by: auth.user.id,
        rejection_reason: null,
      };
      break;
    case "reject":
      update = { status: "rejected", rejection_reason: parsed.data.reason };
      break;
    case "suspend":
      update = {
        status: "suspended",
        suspended_reason: parsed.data.reason,
        suspended_by: auth.user.id,
        suspended_at: now,
      };
      break;
    case "reinstate":
      update = {
        status: "active",
        suspended_reason: null,
        suspended_by: null,
        suspended_at: null,
      };
      break;
  }

  const { data, error } = await admin
    .from("ibp")
    .update(update)
    .eq("id", id)
    .select("id, business_name, status")
    .single();

  if (error) {
    console.error("[ibp/[id] PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to update IBP." }, { status: 500 });
  }

  await admin.from("ibp_activity_log").insert({
    ibp_id: id,
    admin_id: auth.user.id,
    action,
    details:
      "reason" in parsed.data ? { reason: parsed.data.reason } : {},
  });

  return NextResponse.json({ business: data });
}

/** Permanent removal — gated by the dedicated ibp.delete key (decision C-D2). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ibp.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("ibp")
    .select("id, business_name")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "IBP not found." }, { status: 404 });
  }

  // Log first — the activity row cascades with the delete, so write to the
  // platform audit log instead for a durable record.
  await admin.from("activity_logs").insert({
    actor_id: auth.user.id,
    action_type: "ibp_removed",
    target_table: "ibp",
    new_data: { ibp_id: id, business_name: existing.business_name },
  });

  const { error } = await admin.from("ibp").delete().eq("id", id);
  if (error) {
    console.error("[ibp/[id] DELETE] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to remove IBP." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
