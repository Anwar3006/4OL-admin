import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Notification log CSV export (Gap Analysis Part R, R-D7). Server-side CSV
 * from the same source as All Log, honouring the active filters passed as
 * query params: channel, type, status (read|unread), from, to, q.
 */
function csvEscape(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("notifications.export");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const params = req.nextUrl.searchParams;
  const admin = getAdminClient();

  let query = admin
    .from("notifications")
    .select("id, title, body, type, channel, is_broadcast, is_read, delivered_at, opened_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const channel = params.get("channel");
  if (channel) query = query.eq("channel", channel);
  const type = params.get("type");
  if (type) query = query.eq("type", type);
  const status = params.get("status");
  if (status === "read") query = query.eq("is_read", true);
  if (status === "unread") query = query.eq("is_read", false);
  const from = params.get("from");
  if (from) query = query.gte("created_at", from);
  const to = params.get("to");
  if (to) query = query.lte("created_at", to);
  const q = params.get("q");
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[notifications/export GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to export notification log." }, { status: 500 });
  }

  const header = ["Title", "Body", "Type", "Channel", "Audience", "Read", "Delivered At", "Opened At", "Created At"];
  const rows = (data ?? []).map((row) =>
    [
      row.title,
      row.body,
      row.type,
      row.channel,
      row.is_broadcast ? "broadcast" : "user",
      row.is_read ? "yes" : "no",
      row.delivered_at ?? "",
      row.opened_at ?? "",
      row.created_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="notification-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
