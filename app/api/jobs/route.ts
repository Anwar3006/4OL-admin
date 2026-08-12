import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const [postingsResult, applicationsResult, plansResult] = await Promise.all([
    admin
      .from("job_postings")
      .select(
        "id, facility_id, title, job_type, specialty, experience_level, salary_min, salary_max, salary_currency, location, region, status, published_at, expires_at, view_count, application_count, created_at, facility_profile(facility_name, facility_type, area, region)",
      )
      .order("created_at", { ascending: false })
      .limit(75),
    admin
      .from("job_applications")
      .select(
        "id, job_id, applicant_id, cover_letter, resume_url, portfolio_url, status, reviewed_at, review_notes, created_at, job_postings(title, facility_profile(facility_name)), user_profiles(first_name, last_name, phone_number, role)",
      )
      .order("created_at", { ascending: false })
      .limit(75),
    admin
      .from("subscription_plans")
      .select(
        "id, name, slug, tier, price_monthly, price_yearly, currency, is_active, max_listings, display_order",
      )
      .order("display_order", { ascending: true })
      .limit(50),
  ]);

  const error =
    postingsResult.error || applicationsResult.error || plansResult.error;
  if (error) {
    console.error("[jobs] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load Jobs data." },
      { status: 500 },
    );
  }

  const postings = postingsResult.data ?? [];
  const applications = applicationsResult.data ?? [];
  const plans = plansResult.data ?? [];

  return NextResponse.json({
    postings,
    applications,
    plans,
    metrics: {
      listings: postings.length,
      published: postings.filter((posting) => posting.status === "published")
        .length,
      applicants: applications.length,
      pendingApplications: applications.filter(
        (application) => application.status === "pending",
      ).length,
      premiumPlans: plans.filter((plan) => plan.is_active).length,
    },
  });
}
