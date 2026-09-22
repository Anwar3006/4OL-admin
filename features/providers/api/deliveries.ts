/**
 * GET /api/providers/[id]/deliveries — for the Deliveries tab.
 * credential_deliveries.provider_id is nullable (it also logs deliveries
 * unrelated to a specific provider — see P0-06), so this scopes on it
 * directly rather than joining through the owner.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderDeliveryRow } from "../schema/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("credential_deliveries")
    .select("id, channel, status, destination_masked, attempt, error, created_at")
    .eq("provider_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []) as unknown as ProviderDeliveryRow[] });
}
