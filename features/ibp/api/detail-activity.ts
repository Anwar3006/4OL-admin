import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Per-IBP activity log (Gap Analysis Part C: "Activity Log" row action).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ibp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("ibp_activity_log")
    .select("*")
    .eq("ibp_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ activity: [], migration_missing: true });
    }
    console.error("[ibp/[id]/activity] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load activity log." }, { status: 500 });
  }

  // Resolve admin display names in one pass.
  const adminIds = Array.from(
    new Set((data ?? []).map((row) => row.admin_id).filter(Boolean)),
  );
  const { data: profiles } = adminIds.length
    ? await admin
        .from("user_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", adminIds)
    : { data: [] as { user_id: string; first_name: string; last_name: string }[] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || "Admin",
    ]),
  );

  return NextResponse.json({
    activity: (data ?? []).map((row) => ({
      ...row,
      admin_name: nameById.get(row.admin_id) ?? "System",
    })),
  });
}
