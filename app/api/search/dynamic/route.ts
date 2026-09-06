import { NextResponse } from "next/server";

/**
 * Gap Analysis S-D2 — this endpoint is deprecated and returns 410 Gone.
 *
 * It previously ran unauthenticated `select *` ilike scans over
 * facility_profile (PII) and content tables, leaking full rows to any
 * caller. All search traffic should use the authenticated
 * `global_search_v2` Supabase RPC (or the legacy `global_search` RPC
 * until the migration is applied).
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been deprecated. Use the global_search_v2 RPC instead.",
    },
    { status: 410 },
  );
}
