/**
 * /api/diseases — server-backed Diseases & Conditions list + create
 * (Gap Analysis Part I, I-Phase 2 / I9). Replaces the client-side
 * Supabase reads/writes so RBAC (`diseases.view` / `diseases.create`)
 * is enforced server-side.
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

/** GET /api/diseases?page=&limit=&search=&status=&featured= */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("diseases.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10),
  );
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const featured = url.searchParams.get("featured") ?? "";

  const admin = getSupabaseAdmin();
  let query = admin
    .from("conditions")
    .select(CONTENT_SELECT, { count: "exact" });

  if (search) {
    // Mockup: "Search by name, ICD code, category..." - name + ICD-11 here;
    // category match would need a join, kept simple for the admin surface.
    query = query.or(`name.ilike.%${search}%,icd11_code.ilike.%${search}%`);
  }
  if (status) query = query.eq("status", status);
  if (featured === "yes") query = query.eq("is_featured", true);
  if (featured === "no") query = query.eq("is_featured", false);

  const from = (page - 1) * limit;
  const { data, count, error } = await query
    .order("name", { ascending: true })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conditions = (data ?? []).map((row: any) => {
    const {
      condition_body_parts,
      condition_categories,
      condition_causes,
      condition_types,
      ...rest
    } = row;
    return {
      ...rest,
      causes: condition_causes,
      bodyParts:
        condition_body_parts?.map((b: any) => b.body_parts?.name) || [],
      categories:
        condition_categories?.map((c: any) => c.categories?.name) || [],
      types: condition_types?.map((t: any) => t.type_name) || [],
    };
  });

  const total = count ?? 0;
  return NextResponse.json({
    conditions,
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    },
  });
}

/**
 * POST /api/diseases — create via the existing `insert_condition` RPC
 * (keeps junction handling identical to the legacy client flow), then a
 * direct follow-up update persists the new classification columns so the
 * result doesn't depend on the RPC passing unknown payload keys through.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("diseases.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);

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
  const { data: conditionId, error } = await admin.rpc("insert_condition", {
    c_payload: payload,
    bodypartsids: bodyParts,
    categoryids: categories,
    c_types: types,
    c_causes: causes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const classification: Record<string, unknown> = {};
  if (icd11_code !== undefined) classification.icd11_code = icd11_code || null;
  if (severity !== undefined) classification.severity = severity || null;
  if (nhis_coverage !== undefined)
    classification.nhis_coverage = nhis_coverage || null;

  if (Object.keys(classification).length > 0 && conditionId) {
    const { error: patchError } = await admin
      .from("conditions")
      .update(classification)
      .eq("id", conditionId);
    if (patchError) {
      return NextResponse.json(
        { error: `Created, but classification save failed: ${patchError.message}` },
        { status: 500 },
      );
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "condition_created",
    p_target_table: "conditions",
    p_record_id: conditionId ?? null,
    p_description: `Condition "${payload?.name ?? conditionId}" created`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { name: payload?.name ?? null, icd11_code: icd11_code ?? null },
  });

  return NextResponse.json({ ok: true, id: conditionId });
}
