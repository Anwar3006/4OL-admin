/**
 * /api/diseases/[id] — detail, update, delete (Gap Analysis Part I,
 * I-Phase 2 / I9). Update keeps the `update_condition` RPC so junction
 * rewrites stay identical to the legacy client flow; delete cascades the
 * junction rows server-side and optionally clears stored images.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CONTENT_SELECT = `
  *,
  condition_types (type_name, about_type),
  condition_causes (cause_name, other_possible_causes),
  condition_body_parts (body_parts (id, name, mesh_id)),
  condition_categories (categories (id, name, path))
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("diseases.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("conditions")
    .select(CONTENT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const {
    condition_body_parts,
    condition_categories,
    condition_causes,
    condition_types,
    ...rest
  } = data;
  return NextResponse.json({
    ...rest,
    causes: condition_causes,
    bodyParts: condition_body_parts,
    categories: condition_categories,
    types: condition_types,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("diseases.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    bodyParts = [],
    categories = [],
    types = [],
    causes = [],
    icd11_code,
    severity,
    nhis_coverage,
    ...payload
  } = body ?? {};

  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("update_condition", {
    c_id: id,
    c_payload: payload,
    bodypartsids: bodyParts,
    categoryids: categories,
    c_types: types,
    c_causes: causes,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Classification columns persisted directly (see POST /api/diseases note).
  const classification: Record<string, unknown> = {};
  if (icd11_code !== undefined) classification.icd11_code = icd11_code || null;
  if (severity !== undefined) classification.severity = severity || null;
  if (nhis_coverage !== undefined)
    classification.nhis_coverage = nhis_coverage || null;

  if (Object.keys(classification).length > 0) {
    const { error: patchError } = await admin
      .from("conditions")
      .update(classification)
      .eq("id", id);
    if (patchError) {
      return NextResponse.json(
        { error: `Saved, but classification update failed: ${patchError.message}` },
        { status: 500 },
      );
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "condition_updated",
    p_target_table: "conditions",
    p_record_id: id,
    p_description: `Condition ${payload?.name ?? id} updated`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { name: payload?.name ?? null },
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("diseases.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;

  // Optional storage cleanup: the client may send the stored image paths.
  let imagePaths: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.imagePaths)) imagePaths = body.imagePaths;
  } catch {
    /* body is optional */
  }

  const admin = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await admin
    .from("conditions")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Condition not found" }, { status: 404 });
  }

  // Junctions first (FK safety), then the row itself.
  await Promise.all(
    [
      "condition_body_parts",
      "condition_categories",
      "condition_causes",
      "condition_types",
    ].map((table) => admin.from(table).delete().eq("condition_id", id)),
  );
  const { error } = await admin.from("conditions").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (imagePaths.length > 0) {
    await admin.storage.from("conditions").remove(imagePaths);
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "condition_deleted",
    p_target_table: "conditions",
    p_record_id: id,
    p_description: `Condition "${existing.name}" deleted`,
    p_severity: "warning",
    p_old_data: { name: existing.name },
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
