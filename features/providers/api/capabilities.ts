/**
 * GET /api/providers/[id]/capabilities — list, for the Capabilities tab.
 * POST /api/providers/[id]/capabilities — admin override grant, via
 *   grant_provider_capability_override(p_provider_id, p_capability, p_reason)
 *   (P0-11 RPC; raises if p_reason is blank).
 * DELETE /api/providers/[id]/capabilities?capability=x — via
 *   revoke_provider_capability(p_provider_id, p_capability) (P0-11 RPC).
 *
 * The two RPCs self-authorize with `if not is_app_admin() then raise` —
 * `is_app_admin()` reads `request.jwt.claims` (PostgREST's per-request GUC),
 * which is empty for a bare service-role call with no forwarded user JWT.
 * Calling them via getAdminClient() therefore always raised "Not
 * authorized" (caught live before shipping this). getServerClient() carries
 * the signed-in admin's real session/cookies, so auth.uid() resolves and
 * the RPC's own check passes — matching how features/top-rated's sibling
 * RPCs (admin_upsert_top_rated_item et al.) are called, just from a route
 * handler instead of directly from the browser.
 *
 * One latent gap worth knowing about: is_app_admin() checks
 * `role in ('admin','super_admin')` literally — it doesn't know about the
 * RBAC permission catalog. requireAdminApiUser("providers.verify") below
 * would pass for any role holding that permission (today, only admin and
 * super_admin do), but if a future per-user override ever grants
 * providers.verify to some other role, that caller would pass this route's
 * gate and then get "Not authorized" from the RPC itself. Not fixed here —
 * it would mean changing is_app_admin() or the RPCs themselves, shared
 * P0-11 infrastructure outside this module's scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { getServerClient } from "@/lib/db/server";
import type { ProviderCapabilityRow } from "../schema/types";

const CAPABILITIES_SELECT = [
  "provider_id",
  "capability",
  "source",
  "credential_id",
  "granted_by",
  "granted_at",
  "expires_at",
  "override_reason",
  "capabilities (label)",
].join(", ");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_capabilities")
    .select(CAPABILITIES_SELECT)
    .eq("provider_id", id)
    .order("granted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ProviderCapabilityRow[] = (data ?? []).map((row: any) => {
    const capData = Array.isArray(row.capabilities) ? row.capabilities[0] : row.capabilities;
    return { ...row, capability_label: capData?.label ?? null };
  });

  return NextResponse.json({ data: rows });
}

const GRANT_SCHEMA = z.object({
  capability: z.string().min(1),
  reason: z.string().trim().min(1, "A reason is required to grant an override"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.verify");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GRANT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = await getServerClient();
  const { error } = await supabase.rpc("grant_provider_capability_override", {
    p_provider_id: id,
    p_capability: parsed.data.capability,
    p_reason: parsed.data.reason,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.verify");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const capability = request.nextUrl.searchParams.get("capability");
  if (!capability) {
    return NextResponse.json({ error: "capability query param is required" }, { status: 400 });
  }

  const supabase = await getServerClient();
  const { error } = await supabase.rpc("revoke_provider_capability", {
    p_provider_id: id,
    p_capability: capability,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
