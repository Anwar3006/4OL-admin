import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CampaignSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  type: z.string().trim().min(1).max(40).default("system"),
  template_id: z.uuid().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  segment_filter: z.record(z.string(), z.unknown()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function GET() {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const [notificationsResult, campaignsResult, templatesResult, rulesResult, analyticsResult] =
    await Promise.all([
      admin
        .from("notifications")
        .select(
          "id, user_id, title, body, type, channel, metadata, is_read, is_broadcast, campaign_id, read_at, delivered_at, opened_at, sent_by, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      admin
        .from("notification_campaigns")
        .select(
          "id, template_id, title, body, type, metadata, segment_filter, scheduled_at, sent_at, failed_at, failure_reason, delivery_stats, created_at, created_by, approval_status, submitted_for_approval_at, approved_by, approved_at, rejection_reason",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      admin
        .from("notification_templates")
        .select(
          "id, name, template_type, subject, body, source_module, variables, usage_count, last_used_at, is_active, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      admin
        .from("notification_automation_rules")
        .select(
          "id, name, trigger_event, source_module, channel, target_audience, condition_json, template_id, is_active, last_fired_at, fire_count, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      // Real aggregate counts over the full table, not the 75-row page above
      // — the previous version derived "Campaigns: X" etc. from whatever
      // page of rows happened to be fetched, silently undercounting once
      // either table passed 75 rows (same class of bug fixed in Epic 29's
      // get_ai_analytics).
      admin.rpc("get_notification_analytics", { time_filter: "30" }),
    ]);

  const error =
    notificationsResult.error ||
    campaignsResult.error ||
    templatesResult.error ||
    rulesResult.error ||
    analyticsResult.error;
  if (error) {
    console.error("[notifications] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load notification data." },
      { status: 500 },
    );
  }

  const notifications = notificationsResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const rules = rulesResult.data ?? [];
  const analytics = analyticsResult.data;

  return NextResponse.json({
    notifications,
    campaigns,
    templates,
    rules,
    analytics,
    metrics: {
      notificationLog: analytics.notifications.total,
      unread: analytics.notifications.total - analytics.notifications.read,
      broadcasts: analytics.notifications.broadcasts,
      campaigns: analytics.campaigns.total,
      scheduledCampaigns: analytics.campaigns.scheduled,
      failedCampaigns: analytics.campaigns.failed,
      pendingApprovalCampaigns: analytics.campaigns.pending_approval,
      activeTemplates: analytics.templates.active,
      activeRules: analytics.automation_rules.active,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("notifications.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CampaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid campaign", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("notification_campaigns")
    .insert({
      template_id: parsed.data.template_id || null,
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      metadata: {
        ...(parsed.data.metadata ?? {}),
        created_from: "admin_notifications_page",
        created_by: user.id,
      },
      segment_filter: parsed.data.segment_filter ?? { audience: "all_users" },
      scheduled_at: parsed.data.scheduled_at || null,
    })
    .select(
      "id, template_id, title, body, type, metadata, segment_filter, scheduled_at, sent_at, failed_at, failure_reason, delivery_stats, created_at",
    )
    .single();

  if (error) {
    console.error("[notifications] Supabase insert error:", error.message);
    return NextResponse.json(
      { error: "Failed to create notification campaign." },
      { status: 500 },
    );
  }

  return NextResponse.json({ campaign: data });
}
