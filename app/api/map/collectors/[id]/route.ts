import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Collector updates/removal — users.edit (Gap Analysis Part F, F.5).
const PatchCollectorSchema = z
  .object({
    assignedRegion: z.string().trim().min(1).nullable(),
    gpsStatus: z.enum(["active", "weak", "inactive"]),
    notes: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Empty payload" });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const parsed = PatchCollectorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.assignedRegion !== undefined) updates.assigned_region = parsed.data.assignedRegion;
  if (parsed.data.gpsStatus !== undefined) updates.gps_status = parsed.data.gpsStatus;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("map_collectors")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "update_collector",
    p_target_table: "map_collectors",
    p_record_id: id,
    p_description: `Updated collector COL-${id.padStart(3, "0")}`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("map_collectors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "remove_collector",
    p_target_table: "map_collectors",
    p_record_id: id,
    p_description: `Removed collector COL-${id.padStart(3, "0")}`,
  });

  return NextResponse.json({ success: true });
}
