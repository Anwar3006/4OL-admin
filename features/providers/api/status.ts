/**
 * PATCH /api/providers/[id]/status — status transitions for the Providers
 * module, including the P0-14 suspend flow.
 *
 * The permission required depends on the target status, not the route:
 * moving to `suspended` needs providers.suspend (and a reason — "a reason
 * is required" is explicit in PLAN.md's P0-14 suspend-flow bullet, unlike
 * the general status-change endpoint this was adapted from); moving to
 * `active`/`rejected` is a verification decision and needs providers.verify;
 * anything else (inactive/draft/pending) falls back to providers.edit.
 * Visibility once suspended follows from the existing providers RLS
 * (P0-02): only `status='active'` rows are public, so a suspended provider
 * drops out of the directory and out of enquiry matching (which reads the
 * same table) with no extra code here. There is no order system live yet
 * (P1-03, blocked in part by D12), so "open orders continue" has nothing to
 * enforce today.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { PROVIDER_STATUSES } from "../schema/types";

const STATUS_SCHEMA = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100).optional(),
    status: z.enum(PROVIDER_STATUSES),
    reason: z.string().max(2000).optional(),
  })
  .refine((val) => val.status !== "suspended" || (val.reason?.trim().length ?? 0) > 0, {
    message: "A reason is required to suspend a provider",
    path: ["reason"],
  });

function permissionForStatus(status: (typeof PROVIDER_STATUSES)[number]): string {
  if (status === "suspended") return "providers.suspend";
  if (status === "active" || status === "rejected") return "providers.verify";
  return "providers.edit";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const auth = await requireAdminApiUser(permissionForStatus(parsed.data.status));
  if (!auth.ok) return adminAuthErrorResponse(auth);

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

  const { data: updated, error: providerError } = await supabase
    .from("providers")
    .update(providerUpdate)
    .in("id", ids)
    .select("id, name");

  if (providerError) {
    return NextResponse.json({ error: providerError.message }, { status: 500 });
  }

  const privateUpserts = ids.map((providerId) => {
    const record: Record<string, unknown> = {
      provider_id: providerId,
      status_reason: parsed.data.reason ?? null,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status === "active") record.rejection_reason = null;
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
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "provider_status_changed",
    p_target_table: "providers",
    p_record_id: ids[0] ?? null,
    p_description: `${updated?.length ?? 0} provider(s) moved to ${parsed.data.status}`,
    p_severity: parsed.data.status === "active" ? "info" : "warning",
    p_old_data: null,
    p_new_data: { ids, status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
