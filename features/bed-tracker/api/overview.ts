/**
 * GET /api/bedtracker — BedTracker (PKM) overview feed.
 * Gap Analysis Part L: wards grid (L-D1), facilities, ambulance fleet
 * (L-D2), alerts and dispatches behind bedtracker.view. Writes live on
 * /api/bedtracker/{wards,facilities,dispatches,alerts} sub-routes behind
 * bedtracker.manage.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("bedtracker.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [facilitiesResult, wardsResult, fleetResult, alertsResult, dispatchesResult] =
    await Promise.all([
      admin
        .from("bed_tracker_facilities")
        .select(
          "id, facility_id, total_beds, available_beds, occupied_beds, emergency_beds, " +
            "ghs_facility_code, gps_coordinates, facility_admin_name, facility_admin_phone, " +
            "hardware_option, subscription_tier, tablet_online, last_ping_at, " +
            "last_updated_at, updated_by, is_tracking_enabled, alert_threshold, auto_alert_enabled, " +
            "facility_profile(facility_name, facility_type, area, region, status)",
        )
        .order("last_updated_at", { ascending: false })
        .limit(100),
      admin
        .from("bed_tracker_wards")
        .select(
          "id, bed_tracker_facility_id, ward_type, total_beds, occupied_beds, " +
            "available_beds, last_updated_at, update_source, " +
            "bed_tracker_facilities(facility_id, facility_profile(facility_name, region))",
        )
        .order("last_updated_at", { ascending: false })
        .limit(500),
      admin
        .from("ambulances")
        .select("*")
        .eq("is_active", true)
        .order("ambulance_code", { ascending: true })
        .limit(100),
      admin
        .from("bed_tracker_alerts")
        .select(
          "id, facility_id, alert_type, severity, message, bed_type, beds_available, " +
            "beds_total, is_resolved, resolved_at, created_at, " +
            "bed_tracker_facilities(facility_id, facility_profile(facility_name))",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("ambulance_dispatches")
        .select(
          "id, dispatch_reference, emergency_type, caller_name, pickup_address, " +
            "pickup_region, pickup_area, pickup_gps, required_ward, patient_age_group, " +
            "status, priority, eta_minutes, ai_routing_used, created_at, " +
            "destination_facility_id, ambulance_id, " +
            // ambulance_dispatches has TWO foreign keys to facility_profile —
            // destination_facility_id and rerouted_from_facility_id — so an
            // unqualified embed is ambiguous and PostgREST 300s the whole
            // query ("more than one relationship was found"), 500ing the page.
            // This listing wants the destination, which is the id selected
            // just above.
            "facility_profile!ambulance_dispatches_destination_facility_id_fkey" +
            "(facility_name, area, region)",
        )
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const error =
    facilitiesResult.error ||
    wardsResult.error ||
    fleetResult.error ||
    alertsResult.error ||
    dispatchesResult.error;
  if (error) {
    console.error("[bedtracker] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load BedTracker data." },
      { status: 500 },
    );
  }

  const facilities = facilitiesResult.data ?? [];
  const wards = wardsResult.data ?? [];
  const fleet = fleetResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const dispatches = dispatchesResult.data ?? [];

  const totalBeds = wards.reduce(
    (sum: number, ward: any) => sum + Number(ward.total_beds ?? 0),
    0,
  );
  const availableBeds = wards.reduce(
    (sum: number, ward: any) => sum + Number(ward.available_beds ?? 0),
    0,
  );

  return NextResponse.json({
    facilities,
    wards,
    fleet,
    alerts,
    dispatches,
    metrics: {
      trackedFacilities: facilities.length,
      facilitiesOnline: facilities.filter((f: any) => f.tablet_online).length,
      totalBeds,
      availableBeds,
      occupancyPct:
        totalBeds > 0
          ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100)
          : 0,
      criticalWards: wards.filter((ward: any) => Number(ward.available_beds) === 0 && Number(ward.total_beds) > 0).length,
      ambulances: fleet.length,
      ambulancesActive: fleet.filter((unit: any) =>
        ["en_route", "responding"].includes(String(unit.status)),
      ).length,
      activeAlerts: alerts.filter((alert: any) => !alert.is_resolved).length,
      activeDispatches: dispatches.filter((dispatch: any) =>
        ["pending", "assigned", "en_route", "in_progress"].includes(
          String(dispatch.status),
        ),
      ).length,
    },
  });
}
