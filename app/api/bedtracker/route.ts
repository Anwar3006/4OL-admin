import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const [facilitiesResult, alertsResult, dispatchesResult] = await Promise.all([
    admin
      .from("bed_tracker_facilities")
      .select(
        "id, facility_id, total_beds, available_beds, occupied_beds, emergency_beds, icu_beds, icu_available, general_ward_beds, general_ward_available, maternity_beds, maternity_available, pediatric_beds, pediatric_available, last_updated_at, is_tracking_enabled, alert_threshold, auto_alert_enabled, facility_profile(facility_name, facility_type, area, region, status)",
      )
      .order("last_updated_at", { ascending: false })
      .limit(50),
    admin
      .from("bed_tracker_alerts")
      .select(
        "id, facility_id, alert_type, severity, message, bed_type, beds_available, beds_total, is_resolved, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("ambulance_dispatches")
      .select(
        "id, dispatch_reference, emergency_type, caller_name, caller_phone, pickup_address, pickup_area, pickup_region, destination_address, status, priority, eta_minutes, created_at, destination_facility_id, facility_profile(facility_name, area, region)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const error =
    facilitiesResult.error || alertsResult.error || dispatchesResult.error;
  if (error) {
    console.error("[bedtracker] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load BedTracker data." },
      { status: 500 },
    );
  }

  const facilities = facilitiesResult.data ?? [];
  const alerts = alertsResult.data ?? [];
  const dispatches = dispatchesResult.data ?? [];

  const totalBeds = facilities.reduce(
    (sum, facility) => sum + Number(facility.total_beds ?? 0),
    0,
  );
  const availableBeds = facilities.reduce(
    (sum, facility) => sum + Number(facility.available_beds ?? 0),
    0,
  );

  return NextResponse.json({
    facilities,
    alerts,
    dispatches,
    metrics: {
      trackedFacilities: facilities.length,
      totalBeds,
      availableBeds,
      activeAlerts: alerts.filter((alert) => !alert.is_resolved).length,
      activeDispatches: dispatches.filter((dispatch) =>
        ["pending", "assigned", "en_route", "in_progress"].includes(
          String(dispatch.status),
        ),
      ).length,
    },
  });
}
