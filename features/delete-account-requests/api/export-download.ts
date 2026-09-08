/**
 * GET /api/admin/delete-account-requests/export-download?request_id=… —
 * mints a fresh 1-hour signed URL from the object path stored by
 * export-request.ts, rather than returning a stored long-lived URL. Copies
 * the short-expiry pattern in actions/media-storage.actions.ts
 * (getSignedUrl, default 3600s) — the 10-year expiry used elsewhere in this
 * codebase is deliberate there (a mobile-persisted attachment URl with no
 * re-request path) and wrong here: a one-off admin-relayed download link
 * that leaks or expires should just be re-minted, not permanent.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const BUCKET = "user-data-exports";
const EXPIRES_IN_SECONDS = 60 * 60;

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("deleteaccount.data_export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const requestId = new URL(request.url).searchParams.get("request_id");
  if (!requestId) {
    return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: reqRow, error: reqError } = await admin
    .from("delete_account_requests")
    .select("data_export_url, data_export_generated_at")
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });
  if (!reqRow?.data_export_url) {
    return NextResponse.json({ error: "No export has been generated for this request yet." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(reqRow.data_export_url, EXPIRES_IN_SECONDS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    signed_url: data.signedUrl,
    expires_in: EXPIRES_IN_SECONDS,
    generated_at: reqRow.data_export_generated_at,
  });
}
