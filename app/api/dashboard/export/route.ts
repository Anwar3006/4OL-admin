import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Dashboard report export (Gap Analysis Part D) — flattens the overview
// metrics into a two-column CSV. Gated by dashboard.export.
export async function GET() {
  const auth = await requireAdminApiUser("dashboard.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_platform_overview_metrics", {
    time_filter: "30",
  });

  if (error) {
    console.error("[dashboard/export] Supabase RPC error:", error.message);
    return NextResponse.json({ error: "Failed to export dashboard." }, { status: 500 });
  }

  const metrics = (data ?? {}) as Record<string, any>;
  const rows: [string, string][] = [];
  const flatten = (obj: Record<string, any>, prefix: string) => {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        flatten(value, path);
      } else if (!Array.isArray(value)) {
        rows.push([path, String(value ?? "")]);
      }
    }
  };
  // Activity feed is row-oriented — skip it in the flat export.
  const { activity: _activity, ...rest } = metrics;
  flatten(rest, "");

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const csv = [
    "Metric,Value",
    ...rows.map(([metric, value]) => `${escape(metric)},${escape(value)}`),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dashboard-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
