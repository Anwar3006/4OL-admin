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

const SCHEMA = z.object({ request_id: z.string().uuid() });

const BUCKET = "user-data-exports";

type ExportTable =
  | { table: string; column: string }
  | { table: string; orColumns: [string, string] };

// Mirrors the "genuinely user-owned" list in docs/epic3-4-retention-map.md.
// Kept as one explicit list rather than discovered dynamically, matching
// this codebase's house style for anything that walks tables by name (see
// purge_or_anonymize_user() in the Epic 3.4 migration).
const EXPORT_TABLES: ExportTable[] = [
  { table: "medication_enquiries", column: "user_id" },
  { table: "medication_reminders", column: "user_id" },
  { table: "medication_adherence", column: "user_id" },
  { table: "drug_interaction_flags", column: "user_id" },
  { table: "drug_verification_requests", column: "user_id" },
  { table: "period_daily_logs", column: "user_id" },
  { table: "period_cycles", column: "user_id" },
  { table: "period_ttc_profiles", column: "user_id" },
  { table: "period_ovulation_tests", column: "user_id" },
  { table: "period_fertility_insights", column: "user_id" },
  { table: "period_notes", column: "user_id" },
  { table: "messages", column: "sender_id" },
  { table: "conversation_members", column: "user_id" },
  { table: "message_reads", column: "user_id" },
  { table: "chat_support", column: "requested_by" },
  { table: "job_applications", column: "applicant_id" },
  { table: "job_alerts", column: "user_id" },
  { table: "job_saved", column: "user_id" },
  { table: "hcp_digital_cvs", column: "user_id" },
  { table: "hcp_verifications", column: "user_id" },
  { table: "facility_reviews", column: "user_id" },
  { table: "facility_favorites", column: "user_id" },
  { table: "app_reviews", column: "user_id" },
  { table: "escrow_transactions", orColumns: ["buyer_id", "seller_id"] },
  { table: "transaction_records", column: "user_id" },
  { table: "subscription_upgrade_requests", column: "user_id" },
  { table: "user_subscriptions", column: "user_id" },
  { table: "fitness_challenge_entries", column: "user_id" },
  { table: "fitness_challenge_participants", column: "user_id" },
  { table: "fitness_user_streaks", column: "user_id" },
  { table: "fitness_health_sync_logs", column: "user_id" },
  { table: "fitness_onboarding_selections", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "user_push_tokens", column: "user_id" },
  { table: "user_notes", column: "user_id" },
  { table: "device_attestation_log", column: "user_id" },
  { table: "device_sign_in_requests", column: "user_id" },
  { table: "security_device_signals", column: "user_id" },
  { table: "analytics_events", column: "user_id" },
  { table: "challenge_views", column: "user_id" },
  { table: "condition_views", column: "user_id" },
  { table: "exercise_views", column: "user_id" },
  { table: "healthy_living_views", column: "user_id" },
  { table: "symptom_views", column: "user_id" },
  { table: "facility_scout_submissions", column: "submitted_by" },
  { table: "facility_scout_referrals", orColumns: ["referrer_id", "referred_user_id"] },
  { table: "data_collectors", column: "user_id" },
  { table: "map_collectors", column: "user_id" },
  { table: "collector_footprints", column: "collector_id" },
];

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
