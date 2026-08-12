import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
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
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const [notificationsResult, campaignsResult, templatesResult, rulesResult] =
    await Promise.all([
      admin
        .from("notifications")
        .select(
          "id, user_id, title, body, type, metadata, is_read, is_broadcast, campaign_id, read_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(75),
      admin
        .from("notification_campaigns")
        .select(
          "id, template_id, title, body, type, metadata, segment_filter, scheduled_at, sent_at, failed_at, failure_reason, delivery_stats, created_at",
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
    ]);

  const error =
    notificationsResult.error ||
    campaignsResult.error ||
    templatesResult.error ||
    rulesResult.error;
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

  return NextResponse.json({
    notifications,
    campaigns,
    templates,
    rules,
    metrics: {
      notificationLog: notifications.length,
      unread: notifications.filter((item) => !item.is_read).length,
      broadcasts: notifications.filter((item) => item.is_broadcast).length,
      campaigns: campaigns.length,
      scheduledCampaigns: campaigns.filter(
        (item) => item.scheduled_at && !item.sent_at && !item.failed_at,
      ).length,
      failedCampaigns: campaigns.filter((item) => item.failed_at).length,
      activeTemplates: templates.filter((item) => item.is_active).length,
      activeRules: rules.filter((item) => item.is_active).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
