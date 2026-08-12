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
  let query = admin
    .from("admin_activity_logs")
    .select(
      "id, admin_id, admin_email, action_type, target_table, record_id, description, severity, ip_address, created_at",
      { count: "exact" },
    );

  if (parsed.data.severity) query = query.eq("severity", parsed.data.severity);
  if (parsed.data.actionType) {
    query = query.eq("action_type", parsed.data.actionType);
  }
  if (parsed.data.userId) query = query.eq("admin_id", parsed.data.userId);

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
    logs: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}
