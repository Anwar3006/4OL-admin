import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const ThreatQuerySchema = z.object({
  threatLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const ThreatActionSchema = z.object({
  id: z.uuid(),
  action: z.enum(["resolved", "false_positive"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("security.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ThreatQuerySchema.safeParse({
    threatLevel: req.nextUrl.searchParams.get("threatLevel") || undefined,
    status: req.nextUrl.searchParams.get("status") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("security_threats")
    .select(
      "id, threat_level, threat_type, title, description, affected_users, source_ip, source_module, status, created_at, resolved_at",
      { count: "exact" },
    );

  if (parsed.data.threatLevel) {
    query = query.eq("threat_level", parsed.data.threatLevel);
  }
  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[security/threats] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load security threats." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    threats: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("security.settings");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = ThreatActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid threat update", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  // threat_status's real enum labels are open/mitigated/monitoring/review/
  // resolved/auto_resolved — 'false_positive' has never been a valid value
  // (nor was the frontend's other assumed status, 'investigating'). There's
  // no dedicated "not a real threat" enum state, so both UI actions close
  // the threat as 'resolved', distinguished by resolution_notes — this was
  // silently throwing "invalid input value for enum threat_status" on every
  // "False positive" click before this fix.
  const { data, error } = await admin
    .from("security_threats")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution_notes:
        parsed.data.notes ||
        (parsed.data.action === "resolved"
          ? "Resolved from Security Center"
          : "Marked false positive from Security Center"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .select(
      "id, threat_level, threat_type, title, description, affected_users, source_ip, source_module, status, created_at, resolved_at",
    )
    .single();

  if (error) {
    console.error("[security/threats] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update security threat." },
      { status: 500 },
    );
  }

  return NextResponse.json({ threat: data });
}
