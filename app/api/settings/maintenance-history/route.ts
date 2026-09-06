import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/** Maintenance toggle audit trail (Gap Analysis Part P, P10). */
export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("maintenance_history")
    .select("id, enabled, message, toggled_by, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[settings/maintenance-history] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load maintenance history." },
      { status: 500 },
    );
  }

  return NextResponse.json({ history: data ?? [] });
}
