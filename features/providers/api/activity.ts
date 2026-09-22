/**
 * GET /api/providers/[id]/activity — for the Activity tab.
 * provider_activity_log grows fast once there's real traffic (P0-12's own
 * note: it logs every providers/credentials/capabilities/catalogue write,
 * including internal trigger-driven ones) — capped at 200 most recent rows.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderActivityRow } from "../schema/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_activity_log")
    .select("id, action, actor_kind, actor_id, device_id, before, after, created_at")
    .eq("provider_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []) as unknown as ProviderActivityRow[] });
}
