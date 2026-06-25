import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

// Keep this in sync with the mobile app's filter chips. Anything outside
// this list is rejected rather than silently passed through to the query
// builder, since `type` ends up in an `.eq()` filter.
const VALID_TYPES = ["dm", "group_chat", "reminder", "marketing", "ad", "system"] as const;
type NotificationType = (typeof VALID_TYPES)[number];

function isValidType(value: string | null): value is NotificationType {
  return !!value && (VALID_TYPES as readonly string[]).includes(value);
}

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

/**
 * Cursor shape: base64-encoded `${created_at}|${id}` of the last row on the
 * previous page. We page on (created_at DESC, id) — id is the tiebreaker
 * for rows with an identical created_at timestamp, matching the composite
 * index `idx_notifications_user_created_at_id`. Without the id tiebreaker,
 * two notifications inserted in the same millisecond could be skipped or
 * duplicated across pages.
 */
function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}|${id}`).toString("base64");
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [createdAt, id] = decoded.split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/**
 * GET /api/user/notifications?count=true                — unread count
 * GET /api/user/notifications?cursor=...&limit=20        — next page
 * GET /api/user/notifications?type=reminder              — filter by type
 * GET /api/user/notifications?unread=true                — unread only
 * GET /api/user/notifications?search=foo                 — title/body search
 *
 * All filtering, sorting, and counting happens at the database layer.
 * The client never receives more than `limit` rows per call.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const admin = getSupabaseAdmin();

  // ---- Unread count (cheap, indexed, no row data returned) ----
  if (searchParams.get("count") === "true") {
    const { count, error } = await admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count || 0 });
  }

  // ---- Paginated list ----
  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const typeParam = searchParams.get("type");
  if (typeParam && !isValidType(typeParam)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const unreadOnly = searchParams.get("unread") === "true";
  const search = searchParams.get("search")?.trim();
  const cursorParam = searchParams.get("cursor");

  let query = admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    // Fetch one extra row so we can tell the caller whether another page
    // exists without a second round-trip.
    .limit(limit + 1);

  if (typeParam) query = query.eq("type", typeParam);
  if (unreadOnly) query = query.eq("is_read", false);
  if (search) {
    // ilike across both columns. Fine at moderate per-user notification
    // volumes; revisit with a tsvector + GIN index if any single user's
    // notification count grows into the tens of thousands.
    query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
  }

  if (cursorParam) {
    const cursor = decodeCursor(cursorParam);
    if (!cursor) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    // Keyset pagination: strictly older than the last row's (created_at, id).
    // This is what the composite index on (user_id, created_at desc, id)
    // exists to serve -- it stays an index range scan no matter how deep
    // the user pages, unlike OFFSET pagination which gets linearly slower.
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.created_at, last.id) : null;

  return NextResponse.json({ data: page, nextCursor });
}

/** POST /api/user/notifications — create a notification */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (!body.title || !body.body || !isValidType(body.type)) {
    return NextResponse.json(
      { error: `title, body, and a valid type (${VALID_TYPES.join(", ")}) are required` },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: user.id,
      title: body.title,
      body: body.body,
      type: body.type,
      metadata: body.metadata || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * PATCH /api/user/notifications
 *   { "id": "...", "is_read": true }   — mark one notification read/unread
 *   { "markAllRead": true }            — mark every unread notification for
 *                                         this user as read, in one UPDATE,
 *                                         scoped to is_read = false so the
 *                                         write only touches rows that
 *                                         actually change.
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = getSupabaseAdmin();

  if (body.markAllRead === true) {
    const { error, count } = await admin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() }, { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: count ?? 0 });
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "Either 'id' or 'markAllRead: true' is required" },
      { status: 400 }
    );
  }

  const isRead = !!body.is_read;
  const { error } = await admin
    .from("notifications")
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
