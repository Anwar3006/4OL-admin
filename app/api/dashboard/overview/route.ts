import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const QuerySchema = z.object({
  timeFilter: z.enum(["7", "30", "90", "year"]).default("30"),
});

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse({
    timeFilter: req.nextUrl.searchParams.get("timeFilter") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_platform_overview_metrics", {
    time_filter: parsed.data.timeFilter,
  });

  if (error) {
    console.error("[dashboard/overview] Supabase RPC error:", error.message);
    return NextResponse.json(
      { error: "Failed to load platform overview metrics." },
      { status: 500 },
    );
  }

  return NextResponse.json({ metrics: data });
}
