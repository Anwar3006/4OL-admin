/**
 * GET   /api/admin/notifications — the caller's own notification inbox.
 * PATCH /api/admin/notifications — mark one, several, or all as read.
 *
 * Powers the top-nav bell. Scoped strictly to `auth.user.id`: an admin sees
 * their own row in `notifications` plus broadcasts addressed to them, never
 * another user's. That is why this is self-service (no permission key) —
 * same rule as /api/admin/profile. The separate notifications *campaign*
 * console at /api/notifications is the privileged one and keeps its
 * `notifications.view` gate.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PAGE_SIZE = 20;

const PATCH_SCHEMA = z
  .object({
    ids: z.array(z.uuid()).min(1).max(100).optional(),
    all: z.literal(true).optional(),
  })
  .refine((b) => Boolean(b.ids) !== Boolean(b.all), {
    message: "Provide either `ids` or `all: true`, not both",
  });

const FIELDS =
  "id, title, body, type, metadata, is_read, read_at, created_at, campaign_id, is_broadcast";

export async function GET(request: Request) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const admin = getSupabaseAdmin();

  let query = admin
    .from("notifications")
    .select(FIELDS)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (unreadOnly) query = query.eq("is_read", false);

  // The unread count is a separate head-only count so the badge stays exact
  // past the PAGE_SIZE window — deriving it from `items` would cap the badge
  // at 20 and silently under-report a busy inbox.
  const [listResult, countResult] = await Promise.all([
    query,
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("is_read", false),
  ]);

  if (listResult.error) {
    return NextResponse.json({ error: listResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: listResult.data ?? [],
    unreadCount: countResult.count ?? 0,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

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

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  // eq("user_id") on every branch is the ownership check: a forged id list
  // can only ever mark the caller's own rows.
  let update = admin
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  if (parsed.data.ids) update = update.in("id", parsed.data.ids);

  const { data, error } = await update.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("is_read", false);

  return NextResponse.json({ updated: data?.length ?? 0, unreadCount: count ?? 0 });
}
