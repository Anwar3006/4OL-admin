import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("hcp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const [verificationsResult, chatsResult] = await Promise.all([
    admin
      .from("hcp_verifications")
      .select(
        "id, user_id, license_number, license_type, issuing_body, license_expiry, specialty, years_of_practice, verification_status, verified_at, rejection_reason, next_verification_due, created_at, user_profiles(first_name, last_name, phone_number, status, role, last_active)",
      )
      .order("created_at", { ascending: false })
      .limit(75),
    admin
      .from("conversations")
      .select(
        "id, name, group_name, group_category, is_verified_only, is_flagged, flagged_reason, last_message_at, max_members, created_at",
      )
      .eq("type", "group")
      .or("group_category.ilike.%hcp%,group_category.ilike.%health%,is_verified_only.eq.true")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50),
  ]);

  const error = verificationsResult.error || chatsResult.error;
  if (error) {
    console.error("[hcp] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load HCP data." },
      { status: 500 },
    );
  }

  const verifications = verificationsResult.data ?? [];
  const groupChats = chatsResult.data ?? [];

  return NextResponse.json({
    verifications,
    groupChats,
    metrics: {
      totalHcp: verifications.length,
      pending: verifications.filter((item) =>
        ["pending", "under_review"].includes(String(item.verification_status)),
      ).length,
      verified: verifications.filter(
        (item) => item.verification_status === "verified",
      ).length,
      expiring: verifications.filter((item) => {
        if (!item.license_expiry) return false;
        const expiry = new Date(item.license_expiry).getTime();
        return expiry < Date.now() + 1000 * 60 * 60 * 24 * 45;
      }).length,
      groupChats: groupChats.length,
    },
  });
}
