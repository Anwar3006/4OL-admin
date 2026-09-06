import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getAdminClient();
    const { data, count, error } = await supabase
      .from("facility_profile")
      .select(
        "id, facility_name, facility_type, region, district, featured_image_url, email, contact_number, avg_rating",
        { count: "exact" },
      )
      .eq("is_featured", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;
    return NextResponse.json({
      data,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
