import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPeriodRequestUserId } from "@/lib/period-request-auth";

export const runtime = "nodejs";

const EventSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("event"), contentId: z.string().uuid(),
    eventType: z.enum(["impression", "open", "progress", "complete", "helpful", "not_helpful", "share", "dismiss"]),
    appVersion: z.string().trim().max(40).optional(),
  }),
  z.object({ action: z.literal("bookmark"), contentId: z.string().uuid(), bookmarked: z.boolean() }),
  z.object({
    action: z.literal("progress"), contentId: z.string().uuid(),
    progressPercent: z.number().int().min(0).max(100), lastPosition: z.string().trim().max(300).optional(),
  }),
]);

const anonymousEvents = new Map<string, { count: number; reset: number }>();
function limited(key: string) {
  const now = Date.now();
  const item = anonymousEvents.get(key);
  if (!item || item.reset < now) { anonymousEvents.set(key, { count: 1, reset: now + 60_000 }); return false; }
  item.count += 1;
  return item.count > 60;
}

function stripHtml(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function rankContent(content: any[], latestLog: any, latestCycle: any, bookmarks: Set<string>, progress: Map<string, any>) {
  const symptomWords = (latestLog?.symptoms ?? []).map((item: any) => String(item?.name ?? item).toLowerCase()).filter(Boolean);
  const phase = String(latestCycle?.current_phase ?? "").toLowerCase();
  return content.map((item) => {
    const haystack = `${item.title} ${item.topic} ${(item.tags ?? []).join(" ")}`.toLowerCase();
    const symptom = symptomWords.find((word: string) => haystack.includes(word));
    const phaseMatch = Boolean(phase && haystack.includes(phase));
    const savedTopic = [...bookmarks].some((id) => id !== item.id && content.find((candidate) => candidate.id === id)?.topic === item.topic);
    const score = (symptom ? 40 : 0) + (phaseMatch ? 25 : 0) + (savedTopic ? 15 : 0) + (item.featured ? 10 : 0) + Math.min(10, Number(item.reads ?? 0) / 1000);
    const reasonCode = symptom ? "recent_symptom_topic" : phaseMatch ? "current_cycle_phase" : savedTopic ? "saved_topic" : item.featured ? "editor_featured" : "recent_reviewed_content";
    const reason = symptom ? `Relevant to a symptom you chose to track: ${symptom}` : phaseMatch ? `Relevant to your estimated ${phase} phase` : savedTopic ? `Because you saved ${item.topic}` : item.featured ? "Selected by the Plasence editorial team" : "Recently published and clinically reviewed";
    return { ...item, bookmarked: bookmarks.has(item.id), progress: progress.get(item.id)?.progress_percent ?? 0, recommendation: { reasonCode, reason, confidence: Number(Math.min(.95, .5 + score / 100).toFixed(2)), model: "period-library-ranker-1.0" }, _rank: score };
  }).sort((a, b) => b._rank - a._rank || String(b.published_at).localeCompare(String(a.published_at))).map(({ _rank, ...item }) => item);
}

export async function GET(request: NextRequest) {
  const admin = getSupabaseAdmin();
  const userId = await getPeriodRequestUserId(request);
  const now = Date.now();
  const search = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const topic = (request.nextUrl.searchParams.get("topic") ?? "").trim().toLowerCase();
  const contentType = (request.nextUrl.searchParams.get("type") ?? "").trim().toLowerCase();
  const locale = (request.nextUrl.searchParams.get("locale") ?? "en").trim().toLowerCase();
  const slug = (request.nextUrl.searchParams.get("slug") ?? "").trim();
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)));

  const { data: publicationRows, error: publicationError } = await admin.from("period_content_publications")
    .select("content_id,status,starts_at,ends_at,featured,display_order,minimum_app_version")
    .eq("channel", "plasence_library").in("status", ["live", "scheduled"]).limit(1000);
  if (publicationError) return NextResponse.json({ error: "Unable to load the Library catalog" }, { status: 500 });
  const active = (publicationRows ?? []).filter((row) => new Date(row.starts_at).getTime() <= now && (!row.ends_at || new Date(row.ends_at).getTime() > now));
  const ids = active.map((row) => row.content_id);
  if (!ids.length) return NextResponse.json({ content: [], recommendations: [], collections: [], bookmarks: [], progress: [], serverTime: new Date().toISOString() });

  // PLB-002: cycle phase / symptom inputs may only be queried and used for
  // ranking once the user has explicitly granted personalization consent —
  // separate from marketing/research consent, and absent-by-default.
  const personalizationConsented = userId
    ? (await admin.from("period_consent_events").select("granted").eq("user_id", userId).eq("consent_type", "personalization").order("created_at", { ascending: false }).limit(1).maybeSingle()).data?.granted === true
    : false;

  const [{ data: contentRows, error: contentError }, { data: sourceRows }, { data: collectionRows }, bookmarksResult, progressResult, logResult, cycleResult] = await Promise.all([
    admin.from("period_content").select("id,title,slug,summary,topic,content_type,locale,tags,media_url,cover_image_url,reading_minutes,reading_level,featured,version,body_html,reads,helpful_count,not_helpful_count,clinical_reviewed_at,published_at,curation_type").in("id", ids).eq("status", "published").eq("locale", locale).order("published_at", { ascending: false }),
    admin.from("period_content_sources").select("period_content_id,source_menu,source_id,source_title").in("period_content_id", ids),
    admin.from("period_content_collections").select("id,title,slug,description,cover_image_url,curation_type,display_order,starts_at,ends_at,period_content_collection_items(content_id,display_order,reason)").eq("status", "published").order("display_order"),
    userId ? admin.from("period_content_bookmarks").select("content_id,created_at").eq("user_id", userId) : Promise.resolve({ data: [] as any[] }),
    userId ? admin.from("period_content_progress").select("content_id,progress_percent,last_position,completed_at,updated_at").eq("user_id", userId) : Promise.resolve({ data: [] as any[] }),
    personalizationConsented ? admin.from("period_daily_logs").select("symptoms,logged_on").eq("user_id", userId).order("logged_on", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    personalizationConsented ? admin.from("period_cycles").select("current_phase,period_start_date").eq("user_id", userId).order("period_start_date", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (contentError) return NextResponse.json({ error: "Unable to load published Library content" }, { status: 500 });

  const publicationMap = new Map(active.map((row) => [row.content_id, row]));
  const sourcesMap = new Map<string, any[]>();
  (sourceRows ?? []).forEach((source) => sourcesMap.set(source.period_content_id, [...(sourcesMap.get(source.period_content_id) ?? []), source]));
  const bookmarkSet = new Set((bookmarksResult.data ?? []).map((item: any) => item.content_id));
  const progressMap = new Map((progressResult.data ?? []).map((item: any) => [item.content_id, item]));
  const normalized = (contentRows ?? []).map((item) => ({ ...item, featured: item.featured || publicationMap.get(item.id)?.featured, sources: sourcesMap.get(item.id) ?? [], body_html: slug === item.slug ? item.body_html : undefined, preview: stripHtml(item.body_html).slice(0, 220) }));
  const ranked = rankContent(normalized, logResult.data, cycleResult.data, bookmarkSet, progressMap);
  const filtered = ranked.filter((item) => (!slug || item.slug === slug) && (!search || `${item.title} ${item.summary} ${item.topic} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes(search)) && (!topic || item.topic.toLowerCase() === topic) && (!contentType || item.content_type === contentType)).slice(0, limit);
  const activeCollections = (collectionRows ?? []).filter((item: any) => (!item.starts_at || new Date(item.starts_at).getTime() <= now) && (!item.ends_at || new Date(item.ends_at).getTime() > now)).map((collection: any) => ({ ...collection, items: (collection.period_content_collection_items ?? []).filter((item: any) => ids.includes(item.content_id)).sort((a: any, b: any) => a.display_order - b.display_order), period_content_collection_items: undefined }));
  const responseBody = { content: filtered, recommendations: ranked.slice(0, 8), collections: activeCollections, bookmarks: [...bookmarkSet], progress: [...progressMap.values()], topics: [...new Set(ranked.map((item) => item.topic))].sort(), serverTime: new Date().toISOString() };
  const etag = `"${createHash("sha256").update(JSON.stringify(responseBody)).digest("base64url")}"`;
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  return NextResponse.json(responseBody, { headers: { ETag: etag, "Cache-Control": userId ? "private, max-age=60" : "public, max-age=60, stale-while-revalidate=300" } });
}

export async function POST(request: NextRequest) {
  const parsed = EventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Library activity" }, { status: 400 });
  const input = parsed.data;
  const userId = await getPeriodRequestUserId(request);
  const admin = getSupabaseAdmin();
  const { data: publication } = await admin.from("period_content_publications").select("status,starts_at,ends_at").eq("content_id", input.contentId).eq("channel", "plasence_library").in("status", ["live", "scheduled"]).maybeSingle();
  const now = Date.now();
  if (!publication || new Date(publication.starts_at).getTime() > now || (publication.ends_at && new Date(publication.ends_at).getTime() <= now)) return NextResponse.json({ error: "Published Library content was not found" }, { status: 404 });

  if (input.action === "bookmark") {
    if (!userId) return NextResponse.json({ error: "Sign in to sync bookmarks" }, { status: 401 });
    const result = input.bookmarked
      ? await admin.from("period_content_bookmarks").upsert({ user_id: userId, content_id: input.contentId }, { onConflict: "user_id,content_id" })
      : await admin.from("period_content_bookmarks").delete().eq("user_id", userId).eq("content_id", input.contentId);
    if (result.error) return NextResponse.json({ error: "Unable to update bookmark" }, { status: 500 });
    await admin.from("period_content_events").insert({ user_id: userId, content_id: input.contentId, event_type: input.bookmarked ? "bookmark" : "unbookmark" });
    return NextResponse.json({ ok: true, bookmarked: input.bookmarked });
  }

  if (input.action === "progress") {
    if (!userId) return NextResponse.json({ error: "Sign in to sync reading progress" }, { status: 401 });
    const { error } = await admin.from("period_content_progress").upsert({ user_id: userId, content_id: input.contentId, progress_percent: input.progressPercent, last_position: input.lastPosition ?? null, completed_at: input.progressPercent === 100 ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "user_id,content_id" });
    if (error) return NextResponse.json({ error: "Unable to update reading progress" }, { status: 500 });
    await admin.from("period_content_events").insert({ user_id: userId, content_id: input.contentId, event_type: input.progressPercent === 100 ? "complete" : "progress" });
    return NextResponse.json({ ok: true });
  }

  const key = userId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  if (!userId && limited(key)) return NextResponse.json({ error: "Too many activity events" }, { status: 429 });
  const { error } = await admin.from("period_content_events").insert({ user_id: userId, content_id: input.contentId, event_type: input.eventType, app_version: input.appVersion ?? null });
  if (error) return NextResponse.json({ error: "Unable to record Library activity" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
