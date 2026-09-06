/**
 * /api/marketing/campaigns/[id]
 * Gap Analysis Part M: status lifecycle (pause/resume/launch/end), edits,
 * and deletion — all server-side behind RBAC.
 *
 * PATCH  → marketing.edit   — partial update incl. status transitions
 * DELETE → marketing.delete — removes row + best-effort storage cleanup
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const STATUSES = [
  "draft",
  "scheduled",
  "live",
  "paused",
  "ended",
  "pending_review",
  "rejected",
];
const CAMPAIGN_TYPES = [
  "app_promotion",
  "feature_launch",
  "seasonal",
  "business_submitted",
  "referral",
];
const CHANNELS = ["push", "sms", "email", "in_app_banner", "social"];

const PATCH_SCHEMA = z.object({
  marketingType: z.string().min(1).max(40).optional(),
  headline: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(5000).optional(),
  imageUrl: z.string().min(1).optional(),
  cta: z.string().min(1).max(80).optional(),
  organization: z.string().min(1).max(160).optional(),
  links: z.array(z.string()).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  status: z.enum(STATUSES as [string, ...string[]]).optional(),
  campaign_type: z.enum(CAMPAIGN_TYPES as [string, ...string[]]).optional(),
  channels: z.array(z.enum(CHANNELS as [string, ...string[]])).optional(),
  target_segment: z.string().max(160).nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  impressions: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  conversions: z.number().int().nonnegative().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("marketing_profile")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("marketing_profile")
    .select("id, headline, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("marketing_profile")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update campaign" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_campaign_updated",
    p_target_table: "marketing_profile",
    p_record_id: id,
    p_description:
      parsed.data.status && parsed.data.status !== existing.status
        ? `Campaign "${existing.headline}" ${existing.status} → ${parsed.data.status}`
        : `Campaign "${existing.headline}" updated`,
    p_severity: "info",
    p_old_data: { status: existing.status },
    p_new_data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("marketing.delete");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("marketing_profile")
    .select("id, headline, imageUrl")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { error: deleteError } = await admin
    .from("marketing_profile")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Best-effort storage cleanup — never fail the delete over media removal.
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME;
  if (bucket && existing.imageUrl) {
    const { error: storageError } = await admin.storage
      .from(bucket)
      .remove([existing.imageUrl]);
    if (storageError) {
      console.warn("[marketing/campaigns] storage deletion failed:", storageError.message);
    }
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_campaign_deleted",
    p_target_table: "marketing_profile",
    p_record_id: id,
    p_description: `Campaign "${existing.headline}" deleted`,
    p_severity: "warning",
    p_old_data: { headline: existing.headline },
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
