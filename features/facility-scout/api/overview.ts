/**
 * GET /api/facilityscout — FacilityScout programme dashboard payload.
 * Gap Analysis Part N (N2/N7/N8): adds app-user scout submissions
 * (facility_scout_submissions), the leaderboard RPC, and programme config
 * alongside the legacy collector/referral data. Submitter identities are
 * masked per K5 unless the caller is super_admin.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { maskName } from "@/lib/masking";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("facilityscout.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [
    submissionsResult,
    collectorsResult,
    referralsResult,
    scoutResult,
    leaderboardResult,
    configResult,
  ] = await Promise.all([
    admin
      .from("collector_submissions")
      .select(
        "id, collector_id, submission_type, facility_id, data, photos, gps_location, status, reviewed_at, review_notes, created_at, data_collectors(employee_id, region, assigned_areas, user_profiles!data_collectors_user_id_fkey(first_name, last_name, phone_number)), facility_profile(facility_name, area, region)",
      )
      .order("created_at", { ascending: false })
      .limit(75),
    admin
      .from("data_collectors")
      .select(
        "id, user_id, employee_id, region, assigned_areas, total_submissions, approved_submissions, rejected_submissions, pending_submissions, last_active_at, is_active, vehicle_assigned, user_profiles!data_collectors_user_id_fkey(first_name, last_name, phone_number, status)",
      )
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(50),
    admin
      .from("facility_scout_referrals")
      .select(
        "id, referrer_id, referred_facility_id, referred_user_id, referral_type, status, reward_amount, reward_paid, reward_paid_at, expiry_date, created_at, submission_id, reward_mb, network, delivery_phone, delivery_status, facility_profile(facility_name, area, region)",
      )
      .order("created_at", { ascending: false })
      .limit(75),
    admin
      .from("facility_scout_submissions")
      .select(
        "id, submission_ref, submitted_by, facility_name, facility_type, gps_location, photos, region, match_status, matched_facility_id, status, assigned_collector_id, priority, sla_due_at, admin_notes, reviewed_at, review_notes, created_at, user_profiles!facility_scout_submissions_submitted_by_fkey(user_id, first_name, last_name), data_collectors(employee_id), matched_facility:facility_profile!facility_scout_submissions_matched_facility_id_fkey(facility_name)",
      )
      .order("created_at", { ascending: false })
      .limit(250),
    admin.rpc("get_facility_scout_leaderboard", { p_limit: 25 }),
    admin.from("facility_scout_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const error =
    submissionsResult.error ||
    collectorsResult.error ||
    referralsResult.error ||
    scoutResult.error ||
    leaderboardResult.error ||
    configResult.error;
  if (error) {
    console.error("[facilityscout] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load FacilityScout data." },
      { status: 500 },
    );
  }

  const isSuperAdmin = auth.role === "super_admin";
  const submissions = submissionsResult.data ?? [];
  const collectors = collectorsResult.data ?? [];
  const referrals = referralsResult.data ?? [];

  const scoutSubmissions = (
    (scoutResult.data ?? []) as Array<
      Record<string, unknown> & {
        user_profiles:
          | { user_id: string; first_name: string | null; last_name: string | null }
          | { user_id: string; first_name: string | null; last_name: string | null }[]
          | null;
        status: string;
        match_status: string;
      }
    >
  ).map((row) => {
    const profile = Array.isArray(row.user_profiles)
      ? row.user_profiles[0]
      : row.user_profiles;
    const fullName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "";
    return {
      ...row,
      user_profiles: profile
        ? { user_id: profile.user_id, masked_name: isSuperAdmin ? fullName : maskName(fullName) }
        : null,
    };
  });

  const leaderboard = (
    (leaderboardResult.data ?? []) as Array<Record<string, unknown> & { full_name: string }>
  ).map((row) => ({
    ...row,
    full_name: isSuperAdmin ? row.full_name : maskName(row.full_name),
  }));

  const scoutRows = scoutSubmissions;
  const facilitiesAdded = scoutRows.filter((s) =>
    ["registered", "rewarded"].includes(s.status),
  ).length;
  const duplicates = scoutRows.filter((s) => s.match_status === "duplicate").length;
  const rewardsQueue = referrals.filter(
    (r) => r.delivery_status === "pending" && r.reward_mb != null,
  ).length;
  const dataRewardedMb = referrals.reduce(
    (sum, r) => sum + (r.delivery_status === "sent" ? Number(r.reward_mb ?? 0) : 0),
    0,
  );

  return NextResponse.json({
    submissions,
    collectors,
    referrals,
    scout_submissions: scoutRows,
    leaderboard,
    config: configResult.data ?? null,
    metrics: {
      submissions: submissions.length,
      pendingReview:
        submissions.filter((item) =>
          ["pending", "needs_review"].includes(String(item.status)),
        ).length + scoutRows.filter((s) => s.status === "pending").length,
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
      // Part N KPI cards (mockup's 6-card row).
      totalSubmissions: scoutRows.length,
      scoutPending: scoutRows.filter((s) =>
        ["pending", "field_review"].includes(s.status),
      ).length,
      facilitiesAdded,
      duplicates,
      rewardsQueue,
      dataRewardedMb,
    },
  });
}
