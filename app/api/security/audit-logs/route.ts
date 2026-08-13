import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const AuditLogQuerySchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).optional(),
  actionType: z.string().trim().min(1).max(80).optional(),
  userId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = AuditLogQuerySchema.safeParse({
    severity: req.nextUrl.searchParams.get("severity") || undefined,
    actionType: req.nextUrl.searchParams.get("actionType") || undefined,
    userId: req.nextUrl.searchParams.get("userId") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  // Reads from activity_logs, not admin_activity_logs — admin_activity_logs
  // has zero writers anywhere in the codebase (a dead parallel table); this
  // route previously queried it and would have always returned empty.
  // activity_logs is the table admin mutations actually write to, extended
  // with severity/ip_address/user_agent columns for this exact use case
  // (see 20260812_epic11_admin_access_management.sql).
  let query = admin
    .from("activity_logs")
    .select(
      "id, actor_id, actor_name, action_type, target_table, record_id, new_data, severity, ip_address, created_at",
      { count: "exact" },
    );

  if (parsed.data.severity) query = query.eq("severity", parsed.data.severity);
  if (parsed.data.actionType) {
    query = query.eq("action_type", parsed.data.actionType);
  }
  if (parsed.data.userId) query = query.eq("actor_id", parsed.data.userId);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[security/audit-logs] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load audit logs." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    logs: (data ?? []).map((row) => ({
      id: row.id,
      admin_id: row.actor_id,
      admin_email: row.actor_name,
      action_type: row.action_type,
      target_table: row.target_table,
      record_id: row.record_id,
      description: (row.new_data as { description?: string } | null)?.description ?? null,
      severity: row.severity,
      ip_address: row.ip_address,
      created_at: row.created_at,
    })),
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}
