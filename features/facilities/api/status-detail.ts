import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const STATUS_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  status: z.enum(["pending", "active", "inactive", "suspended", "rejected"]),
  reason: z.string().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.approve");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = STATUS_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const supabase = getAdminClient();

  const providerUpdate: Record<string, unknown> = {
    status: parsed.data.status,
    status_changed_at: new Date().toISOString(),
  };
  
  if (parsed.data.status === "active") {
    providerUpdate.approved_by = auth.user.id;
    providerUpdate.approved_at = new Date().toISOString();
  }

  // 1. Update providers table
  const { data: updated, error: providerError } = await supabase
    .from("providers")
    .update(providerUpdate)
    .in("id", ids)
    .select("id, name");

  if (providerError) {
    return NextResponse.json({ error: providerError.message }, { status: 500 });
  }

  // 2. Upsert provider_private table for reasons
  const privateUpserts = ids.map((providerId) => {
    const record: Record<string, unknown> = {
      provider_id: providerId,
      status_reason: parsed.data.reason ?? null,
      updated_at: new Date().toISOString()
    };
    if (parsed.data.status === "active") {
      record.rejection_reason = null;
    }
    if (parsed.data.status === "rejected" && parsed.data.reason) {
      record.rejection_reason = parsed.data.reason;
    }
    return record;
  });

  const { error: privateError } = await supabase
    .from("provider_private")
    .upsert(privateUpserts, { onConflict: "provider_id" });

  if (privateError) {
    console.error("Failed to update provider_private:", privateError);
    // Continue anyway since the main status update succeeded
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facility_status_changed",
    p_target_table: "providers",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} facility(ies) moved to ${parsed.data.status}`,
    p_severity: parsed.data.status === "active" ? "info" : "warning",
    p_old_data: null,
    p_new_data: { ids, status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
