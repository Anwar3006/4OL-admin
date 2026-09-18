/**
 * GET /api/admin/delete-account-requests/export-pdf?request_id=… — the
 * "Personal Data Access Report" a data subject would receive. Admin-only
 * (deleteaccount.data_export), same as the zip export in api/export-request.ts.
 * A self-serve PDF is a separate, future decision — this mirrors that
 * file's own "admin-triggered only" note.
 *
 * The render logic itself lives in api/render-personal-data-report.ts,
 * which has no server-only dependency and can run standalone against the
 * service-role client — see that file's header for why.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { renderPersonalDataReportPdf } from "@/features/delete-account-requests/api/render-personal-data-report";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("deleteaccount.data_export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const requestId = request.nextUrl.searchParams.get("request_id");
  if (!requestId) {
    return NextResponse.json({ error: "request_id is required" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: reqRow, error: reqError } = await admin
    .from("delete_account_requests")
    .select("id, user_id, email, status, reason, created_at")
    .eq("id", requestId)
    .maybeSingle();
  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const buffer = await renderPersonalDataReportPdf(admin, reqRow);

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "delete_request_generate_pdf",
    p_target_table: "delete_account_requests",
    p_record_id: reqRow.id,
    p_description: `Generated Personal Data Access Report PDF for ${reqRow.email}`,
    p_severity: "critical",
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="personal-data-report-${reqRow.id}.pdf"`,
    },
  });
}
