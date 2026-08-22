/**
 * /api/medenquiry
 * Gap Analysis Part AB: Medication Enquiry ledger list behind RBAC.
 *
 * GET → medenquiry.view
 *   Filters: q (medication/user/pharmacy), type (with_rx/otc/hcp_request),
 *   status (mockup vocabulary), tier (free/premium via user_subscriptions),
 *   pharmacy (facility_id — cross-link from the Facilities menu),
 *   page/limit. Rows embed the submitter (privacy-masked for non-SA),
 *   matched pharmacy, escrow state and pharmacy responses; best-price and
 *   response counts are derived server-side.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const STATUSES = [
  "pending_match", "matched", "in_escrow", "pickup_ready",
  "delivery_in_progress", "completed", "cancelled",
];

const UUID_RE = /^[0-9a-f-]{36}$/i;

type EnquiryRow = any;

function maskName(row: EnquiryRow, isSa: boolean): string {
  const first = row?.user?.first_name ?? "";
  const last = row?.user?.last_name ?? "";
  if (!first && !last) return "Unknown User";
  if (isSa) return `${first} ${last}`.trim();
  return `${first} ${last.charAt(0)}.`.trim() || "Masked User";
}

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("medenquiry.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const tier = url.searchParams.get("tier");
  const pharmacy = url.searchParams.get("pharmacy");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "25") || 25));

  try {
    const admin = getSupabaseAdmin();

    // Tier filter resolves subscriber ids first (guarded — degrades to no filter).
    let tierUserIds: string[] | null = null;
    if (tier === "premium" || tier === "free") {
      const { data: subs } = await admin
        .from("user_subscriptions")
        .select("user_id")
        .eq("status", "active");
      if (subs) {
        tierUserIds = [...new Set(subs.map((s) => s.user_id as string))];
      }
    }

    let query = admin
      .from("medication_enquiries")
      .select(
        `
        id, created_at, updated_at, medication_name, medication_description,
        dosage, quantity, unit, urgency, status, enquiry_type, fulfilment_mode,
        delivery_status, delivery_address, delivery_gps, courier_name,
        tracking_number, delivery_distance_km, payment_amount, prescription_url,
        pickup_confirmation_code, notify_on_availability, search_radius_km,
        custom_area, drug_id, user_id, pharmacy_id,
        user:user_profiles!medication_enquiries_user_id_fkey(first_name, last_name, region),
        pharmacy:facility_profile!medication_enquiries_pharmacy_id_fkey(id, facility_name, area, region),
        escrow:escrow_transactions!medication_enquiries_escrow_id_fkey(id, amount, status, dispute_reason, dispute_raised_at),
        responses:enquiry_responses(id, price, available, status, responder_kind, responded_at, facility:facility_profile(id, facility_name, area))
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (q) query = query.or(`medication_name.ilike.%${q}%,medication_description.ilike.%${q}%`);
    if (type && ["with_rx", "otc", "hcp_request"].includes(type)) query = query.eq("enquiry_type", type);
    if (status && STATUSES.includes(status)) query = query.eq("status", status);
    if (pharmacy && UUID_RE.test(pharmacy)) query = query.eq("pharmacy_id", pharmacy);
    if (tier === "premium" && tierUserIds) {
      if (!tierUserIds.length) return NextResponse.json({ ok: true, rows: [], total: 0, page, limit });
      query = query.in("user_id", tierUserIds.slice(0, 200));
    }
    if (tier === "free" && tierUserIds) {
      query = query.not("user_id", "in", `(${tierUserIds.slice(0, 200).join(",")})`);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const isSa = auth.role === SUPER_ADMIN_ROLE;
    const rows = (data ?? []).map((row: EnquiryRow) => {
      const responses = Array.isArray(row.responses) ? row.responses : [];
      const priced = responses.filter((r: EnquiryRow) => r.available && Number(r.price) > 0);
      const best = priced.length
        ? priced.reduce((a: EnquiryRow, b: EnquiryRow) => (Number(a.price) <= Number(b.price) ? a : b))
        : null;
      return {
        ...row,
        submitter_name: maskName(row, isSa),
        submitter_region: row?.user?.region ?? null,
        identity_masked: !isSa,
        pharmacy_name: row?.pharmacy?.facility_name ?? null,
        escrow_amount: row?.escrow?.amount ?? null,
        escrow_status: row?.escrow?.status ?? null,
        response_count: responses.length,
        best_price: best ? Number(best.price) : null,
        best_pharmacy: best?.facility?.facility_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, rows, total: count ?? rows.length, page, limit });
  } catch {
    return NextResponse.json({ error: "Failed to load enquiries" }, { status: 500 });
  }
}
