/**
 * GET /api/diseases/engagement — Engagement Analytics pipeline data source
 * (Mapping Audit Part 4 / Epic 30.1). Aggregates content_engagement across
 * all four health content types: KPIs, daily trend and leaderboards.
 *
 * Guarded by `engagement.view` (admin + content_manager + analyst's *.view).
 * Conditions-only counters remain on /api/diseases/stats.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Join titles for one content type. Selects and table names must stay
 * literal strings so Supabase's generated types resolve.
 */
async function fetchContentTitles(
  admin: ReturnType<typeof getAdminClient>,
  contentType: string,
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
    default:
      return [];
  }
}

const VIEW_COUNT_TABLES = ["conditions", "symptoms", "healthy_living_info", "fitness_exercises"];

export async function GET() {
  const auth = await requireAdminApiUser("engagement.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  const { data, error } = await admin
    .from("content_engagement")
    .select("user_id, content_type, content_id, action, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];

  // ── KPIs ────────────────────────────────────────────────────────────────
  let likes = 0;
  let saves = 0;
  const engagers = new Set<string>();
  for (const row of rows) {
    if (row.action === "like") likes += 1;
    else saves += 1;
    engagers.add(row.user_id);
  }

  let views = 0;
  for (const table of VIEW_COUNT_TABLES) {
    const { data: viewRows } = await admin.from(table).select("view_count");
    views += (viewRows ?? []).reduce((s: number, r: any) => s + (r.view_count ?? 0), 0);
  }

  // ── Daily trend (last 30 days) ─────────────────────────────────────────
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const trendMap = new Map<string, { likes: number; saves: number }>();
  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    if (ts < cutoff) continue;
    const day = row.created_at.slice(0, 10);
    const bucket = trendMap.get(day) ?? { likes: 0, saves: 0 };
    if (row.action === "like") bucket.likes += 1;
    else bucket.saves += 1;
    trendMap.set(day, bucket);
  }
  const trend = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // ── Leaderboards: top liked / saved, titles joined per type ───────────
  const countsByKey = new Map<string, { contentType: string; contentId: string; likes: number; saves: number }>();
  for (const row of rows) {
    const key = `${row.content_type}:${row.content_id}`;
    const entry = countsByKey.get(key) ?? {
      contentType: row.content_type,
      contentId: row.content_id,
      likes: 0,
      saves: 0,
    };
    if (row.action === "like") entry.likes += 1;
    else entry.saves += 1;
    countsByKey.set(key, entry);
  }

  const idsByType = new Map<string, string[]>();
  for (const entry of countsByKey.values()) {
    const list = idsByType.get(entry.contentType) ?? [];
    list.push(entry.contentId);
    idsByType.set(entry.contentType, list);
  }
  const titles = new Map<string, string>();
  for (const [contentType, ids] of idsByType) {
    const joined = await fetchContentTitles(admin, contentType, ids);
    for (const { id, title } of joined) {
      titles.set(`${contentType}:${id}`, title);
    }
  }

  const entries = [...countsByKey.entries()].map(([key, entry]) => ({
    id: entry.contentId,
    name: titles.get(key) ?? "Untitled",
    contentType: entry.contentType,
    likes: entry.likes,
    saves: entry.saves,
  }));

  const topLiked = [...entries].sort((a, b) => b.likes - a.likes).slice(0, 10)
    .map(({ id, name, contentType, likes: value }) => ({ id, name, contentType, value }));
  const topSaved = [...entries].sort((a, b) => b.saves - a.saves).slice(0, 10)
    .map(({ id, name, contentType, saves: value }) => ({ id, name, contentType, value }));

  // ── Per-type breakdown ──────────────────────────────────────────────────
  const byType: Record<string, { likes: number; saves: number }> = {};
  for (const row of rows) {
    const bucket = byType[row.content_type] ?? { likes: 0, saves: 0 };
    if (row.action === "like") bucket.likes += 1;
    else bucket.saves += 1;
    byType[row.content_type] = bucket;
  }

  return NextResponse.json({
    totals: {
      views,
      likes,
      saves,
      uniqueEngagers: engagers.size,
      saveRate: views === 0 ? 0 : +((saves / views) * 100).toFixed(1),
      likeRate: views === 0 ? 0 : +((likes / views) * 100).toFixed(1),
    },
    trend,
    topLiked,
    topSaved,
    byType: Object.entries(byType).map(([type, counts]) => ({ type, ...counts })),
  });
}
