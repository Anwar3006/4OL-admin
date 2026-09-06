import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * WhatsApp Community aggregate (Gap Analysis Part T, T-D1/T-D2). WhatsApp is
 * a channel of the notifications pipeline; this route reads the community
 * layer (groups, Meta template registry, broadcasts) plus the Fitness-tab
 * KPI RPC get_whatsapp_stats(). Degrades to honest empties pre-migration.
 */
export async function GET() {
  const auth = await requireAdminApiUser("whatsapp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const [statsResult, groupsResult, templatesResult, broadcastsResult] = await Promise.all([
    admin.rpc("get_whatsapp_stats"),
    admin
      .from("whatsapp_groups")
      .select("id, name, description, group_type, linked_to, member_count, status, last_message_at, created_at")
      .order("member_count", { ascending: false })
      .limit(100),
    admin
      .from("whatsapp_templates")
      .select("id, meta_template_id, name, language, category, body_preview, status, synced_at")
      .order("name", { ascending: true })
      .limit(100),
    admin
      .from("whatsapp_broadcasts")
      .select("id, name, template_id, group_id, audience_filter, message, media_url, scheduled_at, sent_at, status, delivery_stats, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (groupsResult.error || templatesResult.error || broadcastsResult.error) {
    const error = groupsResult.error || templatesResult.error || broadcastsResult.error;
    console.error("[whatsapp GET] Supabase error:", error?.message);
    return NextResponse.json({
      configured: false,
      stats: null,
      groups: [],
      templates: [],
      broadcasts: [],
    });
  }

  return NextResponse.json({
    configured: true,
    stats: statsResult.error ? null : statsResult.data,
    groups: groupsResult.data ?? [],
    templates: templatesResult.data ?? [],
    broadcasts: broadcastsResult.data ?? [],
  });
}
