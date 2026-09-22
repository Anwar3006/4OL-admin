/**
 * GET /api/providers/[id]/credentials — list, for the Credentials tab.
 * PATCH /api/providers/[id]/credentials/[credentialId] — verify/reject.
 *
 * Verifying/rejecting is a plain status UPDATE via the admin (service-role)
 * client, not a dedicated RPC — trg_provider_credential_status_change
 * (P0-11) already fires on any UPDATE OF status regardless of caller, and
 * handles granting/revoking the dependent capabilities and recomputing
 * verification_status. There's nothing left for a wrapper RPC to do.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderCredentialRow } from "../schema/types";

const CREDENTIALS_SELECT = [
  "id",
  "provider_id",
  "credential_type",
  "number",
  "document_path",
  "issued_at",
  "expires_at",
  "status",
  "rejection_reason",
  "reviewed_by",
  "reviewed_at",
  "created_at",
  "credential_types (label, regulator)",
].join(", ");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_credentials")
    .select(CREDENTIALS_SELECT)
    .eq("provider_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ProviderCredentialRow[] = (data ?? []).map((row: any) => {
    const typeData = Array.isArray(row.credential_types) ? row.credential_types[0] : row.credential_types;
    return {
      ...row,
      credential_type_label: typeData?.label ?? null,
      regulator: typeData?.regulator ?? null,
    };
  });

  return NextResponse.json({ data: rows });
}

const REVIEW_SCHEMA = z
  .object({
    status: z.enum(["verified", "rejected"]),
    rejection_reason: z.string().max(2000).optional(),
  })
  .refine((val) => val.status !== "rejected" || (val.rejection_reason?.trim().length ?? 0) > 0, {
    message: "A reason is required to reject a credential",
    path: ["rejection_reason"],
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; credentialId: string }> },
) {
  const auth = await requireAdminApiUser("providers.verify");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id, credentialId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = REVIEW_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const update: Record<string, unknown> = {
    status: parsed.data.status,
    reviewed_by: auth.user.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason: parsed.data.status === "rejected" ? parsed.data.rejection_reason : null,
  };

  const { data, error } = await supabase
    .from("provider_credentials")
    .update(update)
    .eq("id", credentialId)
    .eq("provider_id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
