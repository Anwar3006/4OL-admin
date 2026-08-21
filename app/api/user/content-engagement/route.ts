/**
 * /api/user/content-engagement — Likes & Saves for health content
 * (Mapping Audit Part 4 / Epic 30.1).
 *
 * JWT-authed (mobile Supabase access token), strictly user-scoped: the
 * caller can only read/write their own rows in content_engagement.
 *
 *   GET    /api/user/content-engagement            → caller's likes/saves, titles joined
 *   POST   /api/user/content-engagement            → { contentType, contentId, action }
 *   DELETE /api/user/content-engagement?...        → remove one like/save
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CONTENT_TYPES = ["condition", "symptom", "healthy_living", "fitness_exercise"] as const;
const ACTIONS = ["like", "save"] as const;

type ContentType = (typeof CONTENT_TYPES)[number];
type Action = (typeof ACTIONS)[number];

/**
 * Join titles for one content type. Selects and table names must stay
 * literal strings so Supabase's generated types resolve (dynamic strings
 * yield GenericStringError).
 */
async function fetchContentTitles(
  admin: ReturnType<typeof getSupabaseAdmin>,
  contentType: ContentType,
  ids: string[],
): Promise<{ id: string; title: string }[]> {
  const uniqueIds = [...new Set(ids)];
  switch (contentType) {
    case "condition": {
      const { data } = await admin.from("conditions").select("id, name").in("id", uniqueIds);
      return (data ?? []).map((r) => ({ id: r.id, title: r.name ?? "Untitled" }));
    }
    case "symptom": {
      const { data } = await admin.from("symptoms").select("id, name").in("id", uniqueIds);
      return (data ?? []).map((r) => ({ id: r.id, title: r.name ?? "Untitled" }));
    }
    case "healthy_living": {
      const { data } = await admin.from("healthy_living_info").select("id, name").in("id", uniqueIds);
      return (data ?? []).map((r) => ({ id: r.id, title: r.name ?? "Untitled" }));
    }
    case "fitness_exercise": {
      const { data } = await admin.from("fitness_exercises").select("id, exercise_name").in("id", uniqueIds);
      return (data ?? []).map((r) => ({ id: r.id, title: r.exercise_name ?? "Untitled" }));
    }
  }
}

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

function parseParams(input: {
  contentType?: unknown;
  contentId?: unknown;
  action?: unknown;
}): { contentType: ContentType; contentId: string; action: Action } | null {
  const contentType = input.contentType as ContentType;
  const contentId = typeof input.contentId === "string" ? input.contentId.trim() : "";
  const action = input.action as Action;
  if (!CONTENT_TYPES.includes(contentType)) return null;
  if (!ACTIONS.includes(action)) return null;
  if (!contentId) return null;
  return { contentType, contentId, action };
}

/** GET /api/user/content-engagement — the caller's liked/saved content. */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("content_engagement")
    .select("content_type, content_id, action, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];

  // Join titles per content type (polymorphic — no PostgREST embed).
  const idsByType = new Map<ContentType, string[]>();
  for (const row of rows) {
    const list = idsByType.get(row.content_type as ContentType) ?? [];
    list.push(row.content_id);
    idsByType.set(row.content_type as ContentType, list);
  }

  const titles = new Map<string, string>();
  for (const [contentType, ids] of idsByType) {
    const joined = await fetchContentTitles(admin, contentType, ids);
    for (const { id, title } of joined) {
      titles.set(`${contentType}:${id}`, title);
    }
  }

  const items = rows.map((row) => ({
    contentType: row.content_type,
    contentId: row.content_id,
    action: row.action,
    createdAt: row.created_at,
    title: titles.get(`${row.content_type}:${row.content_id}`) ?? null,
  }));

  return NextResponse.json({ data: items });
}

/** POST /api/user/content-engagement — record a like or save (idempotent). */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = parseParams(body ?? {});
  if (!parsed) {
    return NextResponse.json(
      { error: "contentType, contentId and action are required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("content_engagement").insert({
    user_id: user.id,
    content_type: parsed.contentType,
    content_id: parsed.contentId,
    action: parsed.action,
  });

  if (error) {
    // Already liked/saved — treat as success (mobile toggles optimistically).
    if (error.code === "23505") return NextResponse.json({ ok: true, note: "already_recorded" });
    // Validation trigger: the content row does not exist.
    if (error.code === "23503") return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/user/content-engagement — remove one like or save. */
export async function DELETE(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const body = await req.json().catch(() => null);
  const parsed = parseParams({ ...(body ?? {}), ...query });
  if (!parsed) {
    return NextResponse.json(
      { error: "contentType, contentId and action are required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("content_engagement")
    .delete()
    .eq("user_id", user.id)
    .eq("content_type", parsed.contentType)
    .eq("content_id", parsed.contentId)
    .eq("action", parsed.action);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
