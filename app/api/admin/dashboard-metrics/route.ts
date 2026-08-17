import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const QuerySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "90d"]).default("30d"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("dashboard.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = QuerySchema.safeParse({
    period: req.nextUrl.searchParams.get("period") || "30d",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_admin_dashboard_metrics", {
    time_filter: parsed.data.period,
  });

  if (error) {
    console.error("[admin/dashboard-metrics] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load admin dashboard metrics." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
