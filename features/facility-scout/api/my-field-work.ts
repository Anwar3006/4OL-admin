/**
 * GET /api/facilityscout/my-field-work — a registrar's own field-work
 * console data: submissions assigned to them for verification, and the
 * facility_profile rows they've registered (bucketed by status). Read-only;
 * registering/editing a facility happens through the existing Facilities
 * RPCs (register_facility_with_profile, registrar_update_own_facility),
 * not this route.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("facilityscout.assignments");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  const { data: collector, error: collectorError } = await admin
    .from("registrars")
    .select(
      "id, employee_id, region, assigned_areas, total_submissions, approved_submissions, rejected_submissions, pending_submissions, last_active_at, is_active",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (collectorError) {
    return NextResponse.json({ error: collectorError.message }, { status: 500 });
  }

  if (!collector) {
    // role='registrar' but no registrars row yet — nothing assignable to
    // them yet. See features/facility-scout/README.md.
    return NextResponse.json({ collector: null, submissions: [], facilities: [] });
  }

  const [submissionsResult, facilitiesResult] = await Promise.all([
    admin
      .from("facility_scout_submissions")
      .select(
        "id, submission_ref, facility_name, facility_type, gps_location, photos, region, status, priority, sla_due_at, admin_notes, created_at",
      )
      .eq("assigned_collector_id", collector.id)
      .order("created_at", { ascending: false }),
    admin
      .from("facility_profile")
      .select(
        "id, facility_name, facility_type, gps_address, latitude, longitude, region, area, district, status, status_reason, contact_number, email, created_at, updated_at",
      )
      .eq("submitted_by", auth.user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (submissionsResult.error) {
    return NextResponse.json({ error: submissionsResult.error.message }, { status: 500 });
  }
  if (facilitiesResult.error) {
    return NextResponse.json({ error: facilitiesResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    collector,
    submissions: submissionsResult.data ?? [],
    facilities: facilitiesResult.data ?? [],
  });
}
