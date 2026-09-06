/**
 * /api/medenquiry/disputes
 * Gap Analysis Part AB: escrow dispute queue behind RBAC.
 *
 * GET → medenquiry.view — escrow rows in dispute with enquiry context
 * (user claim / pharmacy claim, amount, opened date).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("medenquiry.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("escrow_transactions")
      .select(
        `
        id, transaction_reference, amount, currency, status,
        dispute_reason, dispute_raised_at, dispute_resolved_at, dispute_resolution,
        enquiry:medication_enquiries!escrow_transactions_enquiry_id_fkey(
          id, medication_name, dosage, status, fulfilment_mode, delivery_proof_url,
          user:user_profiles!medication_enquiries_user_id_fkey(first_name, last_name),
          pharmacy:facility_profile!medication_enquiries_pharmacy_id_fkey(facility_name)
        )
        `,
      )
      .eq("status", "disputed")
      .order("dispute_raised_at", { ascending: true, nullsFirst: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load disputes" }, { status: 500 });
  }
}
