/**
 * /api/marketing/campaigns
 * Gap Analysis Part M (M-D2): marketing was the only module with zero API
 * surface — every hook hit Supabase client-side, bypassing RBAC. These
 * routes are the server retrofit.
 *
 * GET  → marketing.view  — paginated list + filters + status analytics
 * POST → marketing.create — create campaign (draft / scheduled / pending_review)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

const CREATE_SCHEMA = z.object({
  marketingType: z.string().min(1).max(40),
  headline: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  imageUrl: z.string().min(1),
  cta: z.string().min(1).max(80),
  organization: z.string().min(1).max(160),
  links: z.array(z.string()).default([]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(["draft", "scheduled", "pending_review"]).default("draft"),
  campaign_type: z.enum(CAMPAIGN_TYPES).optional(),
  channels: z.array(z.enum(CHANNELS)).optional(),
  target_segment: z.string().max(160).optional(),
  budget: z.number().nonnegative().optional(),
  submitted_by_business: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const channel = url.searchParams.get("channel") ?? "";

  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
  }
  if (type && !CAMPAIGN_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type filter: ${type}` }, { status: 400 });
  }
  if (channel && !CHANNELS.includes(channel)) {
    return NextResponse.json({ error: `Invalid channel filter: ${channel}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let query = admin.from("marketing_profile").select("*", { count: "exact" });
  if (search) {
    query = query.or(
      `headline.ilike.%${search}%,description.ilike.%${search}%,organization.ilike.%${search}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("campaign_type", type);
  if (channel) query = query.contains("channels", [channel]);

  const from = (page - 1) * limit;
  const [listResult, statsResult] = await Promise.all([
    query.order("createdAt", { ascending: false }).range(from, from + limit - 1),
    admin.from("marketing_profile").select("status"),
  ]);

  if (listResult.error) {
    return NextResponse.json({ error: listResult.error.message }, { status: 500 });
  }
  if (statsResult.error) {
    return NextResponse.json({ error: statsResult.error.message }, { status: 500 });
  }

  const rows = statsResult.data ?? [];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const total = listResult.count ?? 0;

  return NextResponse.json({
    data: listResult.data ?? [],
    meta: { totalPages: Math.ceil(total / limit), total, currentPage: page },
    analytics: {
      draft: count("draft"),
      scheduled: count("scheduled"),
      live: count("live"),
      paused: count("paused"),
      ended: count("ended"),
      pending_review: count("pending_review"),
      rejected: count("rejected"),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser("marketing.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CREATE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: created, error } = await admin
    .from("marketing_profile")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create campaign" },
      { status: 500 },
    );
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "marketing_campaign_created",
    p_target_table: "marketing_profile",
    p_record_id: created.id,
    p_description: `Campaign "${created.headline}" created (${created.status})`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { status: created.status, campaign_type: created.campaign_type },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
