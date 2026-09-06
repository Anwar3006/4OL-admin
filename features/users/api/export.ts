import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { auditAdminRead } from "@/lib/security-audit";

function csvEscape(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const auth = await requireAdminApiUser("users.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id, first_name, last_name, user_type, role, status, phone_number, sex, created_at, last_active")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/users/export] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to export users." }, { status: 500 });
  }

  // Part AK (AK-D9): bulk export is THE mass-exfiltration vector — every
  // export is audited with its row count; repeated exports inside an hour
  // trip the read-anomaly signal server-side.
  void auditAdminRead(auth.user.id, "admin/users/export", (data ?? []).length);

  const headers = ["User ID", "First Name", "Last Name", "Type", "Status", "Phone", "Sex", "Created At", "Last Active"];
  const rows = (data ?? []).map((u) =>
    [u.user_id, u.first_name, u.last_name, u.user_type, u.status, u.phone_number, u.sex, u.created_at, u.last_active]
      .map(csvEscape)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
