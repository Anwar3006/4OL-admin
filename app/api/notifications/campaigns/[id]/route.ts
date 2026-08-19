import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ActionSchema = z.object({
  action: z.enum(["update", "submit", "approve", "reject", "revise", "send", "cancel"]),
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  type: z.string().trim().min(1).max(40).optional(),
  templateId: z.uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  segmentFilter: z.record(z.string(), z.unknown()).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: campaign, error } = await admin
    .from("notification_campaigns")
    .select(
      "id, template_id, title, body, type, metadata, segment_filter, scheduled_at, sent_at, failed_at, failure_reason, delivery_stats, created_at, created_by, approval_status, submitted_for_approval_at, approved_by, approved_at, rejection_reason, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[notifications/campaigns/:id GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load campaign." }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const { data: receipts } = await admin
    .from("notification_delivery_receipts")
    .select("send_status, receipt_status")
    .eq("campaign_id", id);

  const receiptSummary = (receipts ?? []).reduce(
    (acc, r) => {
      acc.total++;
      if (r.send_status) acc.bySendStatus[r.send_status] = (acc.bySendStatus[r.send_status] ?? 0) + 1;
      if (r.receipt_status) acc.byReceiptStatus[r.receipt_status] = (acc.byReceiptStatus[r.receipt_status] ?? 0) + 1;
      return acc;
    },
    { total: 0, bySendStatus: {} as Record<string, number>, byReceiptStatus: {} as Record<string, number> },
  );

  const segmentPreview = await admin.rpc("get_notification_segment_count", {
    p_segment_filter: campaign.segment_filter ?? { audience: "all_users" },
  });

  return NextResponse.json({
    campaign,
    receiptSummary,
    segmentPreview: segmentPreview.data ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("notifications.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const { id } = await params;
  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("notification_campaigns")
    .select("approval_status, sent_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  switch (parsed.data.action) {
    case "update": {
      if (!["draft", "rejected"].includes(existing.approval_status)) {
        return NextResponse.json(
          { error: "Only draft or rejected campaigns can be edited." },
          { status: 400 },
        );
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({
          ...(parsed.data.title !== undefined && { title: parsed.data.title }),
          ...(parsed.data.body !== undefined && { body: parsed.data.body }),
          ...(parsed.data.type !== undefined && { type: parsed.data.type }),
          ...(parsed.data.templateId !== undefined && { template_id: parsed.data.templateId }),
          ...(parsed.data.scheduledAt !== undefined && { scheduled_at: parsed.data.scheduledAt }),
          ...(parsed.data.segmentFilter !== undefined && { segment_filter: parsed.data.segmentFilter }),
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "submit": {
      if (existing.approval_status !== "draft") {
        return NextResponse.json(
          { error: "Only draft campaigns can be submitted for approval." },
          { status: 400 },
        );
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({ approval_status: "pending_approval", submitted_for_approval_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "approve": {
      if (existing.approval_status !== "pending_approval") {
        return NextResponse.json(
          { error: "Only campaigns pending approval can be approved." },
          { status: 400 },
        );
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({ approval_status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "reject": {
      if (existing.approval_status !== "pending_approval") {
        return NextResponse.json(
          { error: "Only campaigns pending approval can be rejected." },
          { status: 400 },
        );
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({
          approval_status: "rejected",
          rejection_reason: parsed.data.rejectionReason ?? "Rejected by reviewer",
        })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "revise": {
      if (existing.approval_status !== "rejected") {
        return NextResponse.json(
          { error: "Only rejected campaigns can be moved back to draft." },
          { status: 400 },
        );
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({ approval_status: "draft" })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "cancel": {
      if (existing.sent_at) {
        return NextResponse.json({ error: "A sent campaign cannot be cancelled." }, { status: 400 });
      }
      const { error } = await admin
        .from("notification_campaigns")
        .update({ approval_status: "draft", scheduled_at: null })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "send": {
      if (existing.sent_at) {
        return NextResponse.json({ error: "Campaign was already sent." }, { status: 400 });
      }
      if (existing.approval_status !== "approved") {
        return NextResponse.json(
          { error: "Campaign must be approved before it can be sent." },
          { status: 400 },
        );
      }
      const { data, error } = await admin.rpc("send_notification_campaign", {
        p_campaign_id: id,
        p_admin_id: user.id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, result: data });
    }
  }

  return NextResponse.json({ success: true });
}
