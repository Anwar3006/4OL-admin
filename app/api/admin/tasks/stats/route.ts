import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_admin_task_stats");

  if (error) {
    console.error("[admin/tasks/stats] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load task stats." }, { status: 500 });
  }

  return NextResponse.json(data);
}
