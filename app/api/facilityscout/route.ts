import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const [submissionsResult, collectorsResult, referralsResult] =
    await Promise.all([
      admin
        .from("collector_submissions")
        .select(
          "id, collector_id, submission_type, facility_id, data, photos, gps_location, status, reviewed_at, review_notes, created_at, data_collectors(employee_id, region, assigned_areas, user_profiles(first_name, last_name, phone_number)), facility_profile(facility_name, area, region)",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      admin
        .from("data_collectors")
        .select(
          "id, user_id, employee_id, region, assigned_areas, total_submissions, approved_submissions, rejected_submissions, pending_submissions, last_active_at, is_active, vehicle_assigned, user_profiles(first_name, last_name, phone_number, status)",
        )
        .order("last_active_at", { ascending: false, nullsFirst: false })
        .limit(50),
      admin
        .from("facility_scout_referrals")
        .select(
          "id, referrer_id, referred_facility_id, referred_user_id, referral_type, status, reward_amount, reward_paid, reward_paid_at, expiry_date, created_at, facility_profile(facility_name, area, region)",
        )
        .order("created_at", { ascending: false })
        .limit(75),
    ]);

  const error =
    submissionsResult.error || collectorsResult.error || referralsResult.error;
  if (error) {
    console.error("[facilityscout] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load FacilityScout data." },
      { status: 500 },
    );
  }

  const submissions = submissionsResult.data ?? [];
  const collectors = collectorsResult.data ?? [];
  const referrals = referralsResult.data ?? [];

  return NextResponse.json({
    submissions,
    collectors,
    referrals,
    metrics: {
      submissions: submissions.length,
      pendingReview: submissions.filter((item) =>
        ["pending", "needs_review"].includes(String(item.status)),
      ).length,
      activeCollectors: collectors.filter((collector) => collector.is_active)
        .length,
      rewardsDue: referrals.filter(
        (referral) =>
          ["completed", "rewarded"].includes(String(referral.status)) &&
          !referral.reward_paid,
      ).length,
      rewardLiability: referrals.reduce(
        (sum, referral) =>
          sum + (!referral.reward_paid ? Number(referral.reward_amount ?? 0) : 0),
        0,
      ),
    },
  });
}
