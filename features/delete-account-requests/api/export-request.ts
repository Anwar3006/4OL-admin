/**
 * POST /api/admin/delete-account-requests/export-request — Epic 3.4 GDPR
 * export ("everything we have about you"). Walks every user-owned table
 * docs/epic3-4-retention-map.md categorizes, regardless of that table's
 * eventual deletion/retention disposition — an export has to include data
 * that will later be anonymized or hard-deleted, not just what survives.
 *
 * Admin-triggered only: a self-serve in-app export button is a new
 * mobile-facing route and needs its own Expo release (CLAUDE.md rule 2).
 * Zips one JSON file per table, uploads to the private `user-data-exports`
 * bucket, and stores the OBJECT PATH — not a fetchable URL — on the
 * request row. A fresh signed URL is minted on demand by
 * features/delete-account-requests/api/export-download.ts.
 */

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { auditAdminRead } from "@/lib/security-audit";
import { EXPORT_TABLES } from "@/features/delete-account-requests/schema/export-tables";

const SCHEMA = z.object({ request_id: z.string().uuid() });

const BUCKET = "user-data-exports";

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("deleteaccount.data_export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: reqRow, error: reqError } = await admin
    .from("delete_account_requests")
    .select("id, user_id, email")
    .eq("id", parsed.data.request_id)
    .maybeSingle();

  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const zip = new JSZip();
  let totalRows = 0;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", reqRow.user_id)
    .maybeSingle();
  zip.file("user_profiles.json", JSON.stringify(profile ?? null, null, 2));
  if (profile) totalRows += 1;

  for (const entry of EXPORT_TABLES) {
    const query = admin.from(entry.table).select("*");
    const { data, error } = await (
      "column" in entry
        ? query.eq(entry.column, reqRow.user_id)
        : query.or(`${entry.orColumns[0]}.eq.${reqRow.user_id},${entry.orColumns[1]}.eq.${reqRow.user_id}`)
    );

    if (error) {
      // A single table failing (renamed column, RLS surprise) shouldn't
      // block the whole export -- record it in the package instead.
      zip.file(`${entry.table}.error.txt`, error.message);
      continue;
    }

    zip.file(`${entry.table}.json`, JSON.stringify(data ?? [], null, 2));
    totalRows += data?.length ?? 0;
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const objectPath = `exports/${reqRow.id}.zip`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType: "application/zip", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("delete_account_requests")
    .update({ data_export_url: objectPath, data_export_generated_at: nowIso })
    .eq("id", reqRow.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "delete_request_generate_export",
    p_target_table: "delete_account_requests",
    p_record_id: reqRow.id,
    p_description: `Generated GDPR data export for ${reqRow.email} (${totalRows} rows across ${EXPORT_TABLES.length + 1} tables)`,
    p_severity: "critical",
  });

  void auditAdminRead(auth.user.id, "admin/delete-account-requests/export-request", totalRows, reqRow.user_id);

  return NextResponse.json({ ok: true, object_path: objectPath, generated_at: nowIso, row_count: totalRows });
}
