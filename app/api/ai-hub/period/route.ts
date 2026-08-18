import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const SourceMenu = z.enum(["healthy_living", "conditions", "symptoms"]);
const ContentFormat = z.enum(["article", "quick_read", "video", "podcast", "expert_qa"]);
const GenerateSchema = z.object({
  jobType: z.enum(["trivia_generation", "content_curation", "content_suggestion", "engagement_copy"]),
  sourceMenus: z.array(SourceMenu).min(1).max(3),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  answerCount: z.number().int().min(2).max(6).default(4),
  questionCount: z.literal(10).default(10),
  eventId: z.string().uuid().optional(),
  rewardId: z.string().uuid().optional(),
  topic: z.string().trim().max(120).optional(),
  contentFormat: ContentFormat.default("quick_read"),
  audience: z.enum(["general", "teens", "adults", "caregivers"]).default("general"),
  tone: z.enum(["supportive", "educational", "concise"]).default("supportive"),
  readingLength: z.enum(["short", "medium", "long"]).default("medium"),
  locale: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).default("en"),
  suggestionCount: z.number().int().min(1).max(12).default(8),
});

type Source = { id: string; menu: z.infer<typeof SourceMenu>; title: string; excerpt: string; body: string };

async function loadSources(menus: z.infer<typeof SourceMenu>[]): Promise<Source[]> {
  const admin = getSupabaseAdmin();
  const configs = {
    healthy_living: { table: "healthy_living_info", title: "name", hasStatus: true, fields: "id,name,description,content,status" },
    conditions: { table: "conditions", title: "name", hasStatus: true, fields: "id,name,description,status" },
    symptoms: { table: "symptoms", title: "name", hasStatus: true, fields: "id,name,description,status" },
  } as const;
  const batches = await Promise.all(menus.map(async (menu) => {
    const config = configs[menu];
    const base = admin.from(config.table).select(config.fields).limit(30);
    const { data, error } = config.hasStatus ? await base.or("status.eq.published,status.eq.active,status.is.null") : await base;
    if (error) throw new Error(`SOURCE_${menu.toUpperCase()}_UNAVAILABLE`);
    return (data ?? []).map((row: any) => {
      const body = [row.description, row.content ? JSON.stringify(row.content) : ""].filter(Boolean).join("\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
      id: String(row.id), menu, title: String(row[config.title] ?? "Untitled"),
      excerpt: body.slice(0, 1200), body: body.slice(0, 12000),
    }});
  }));
  return batches.flat().filter((item) => item.excerpt).slice(0, 60);
}

async function indexSources(sources: Source[]) {
  const admin = getSupabaseAdmin();
  const indexedAt = new Date().toISOString();
  const { data: documents, error } = await admin.from("period_source_documents").upsert(sources.map((source) => ({
    source_menu: source.menu, source_id: source.id, title: source.title, summary: source.excerpt,
    body_text: source.body, source_status: "active", source_hash: createHash("sha256").update(`${source.title}\n${source.body}`).digest("hex"), indexed_at: indexedAt,
  })), { onConflict: "source_menu,source_id" }).select("id,source_menu,source_id");
  if (error || !documents?.length) throw new Error("SOURCE_INDEX_FAILED");
  const documentMap = new Map(documents.map((document) => [`${document.source_menu}:${document.source_id}`, document.id]));
  const documentIds = documents.map((document) => document.id);
  const { error: deleteError } = await admin.from("period_source_chunks").delete().in("document_id", documentIds);
  if (deleteError) throw new Error("SOURCE_CHUNK_REFRESH_FAILED");
  const chunkRows = sources.flatMap((source) => {
    const documentId = documentMap.get(`${source.menu}:${source.id}`);
    if (!documentId) return [];
    return (source.body.match(/[\s\S]{1,1400}(?=\s|$)/g) ?? [source.body]).filter(Boolean).slice(0, 20).map((content, chunkIndex) => ({
      document_id: documentId, chunk_index: chunkIndex, heading: chunkIndex === 0 ? source.title : `${source.title} · ${chunkIndex + 1}`,
      content, content_hash: createHash("sha256").update(content).digest("hex"),
    }));
  });
  const { error: chunkError } = await admin.from("period_source_chunks").insert(chunkRows);
  if (chunkError) throw new Error("SOURCE_CHUNK_INDEX_FAILED");
}

// Translated from the previous Gemini SchemaType DSL to OpenAI Structured
// Outputs. OpenAI's strict mode (json_schema.strict: true) requires every
// property in `properties` to also appear in `required` and
// `additionalProperties: false` on every object level, so item fields that
// only apply to one jobType (e.g. `question` for trivia, `body` for content)
// are always-required but may come back as an empty string/array when the
// model has nothing meaningful to say for that field — the per-jobType
// validation below only reads the fields relevant to that job's items.
const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    rationale: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" }, question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctOption: { type: "number" }, explanation: { type: "string" },
          title: { type: "string" }, summary: { type: "string" }, body: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          coverImageBrief: { type: "string" },
          alertCopy: { type: "string" }, sourceMenu: { type: "string" }, sourceId: { type: "string" },
        },
        required: ["topic", "question", "options", "correctOption", "explanation", "title", "summary", "body", "tags", "coverImageBrief", "alertCopy", "sourceMenu", "sourceId"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "rationale", "items"],
  additionalProperties: false,
};

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const [{ data: jobs }, { data: events }, { data: leads }, { count: sourceLinks }, { data: rewards }] = await Promise.all([
    admin.from("period_ai_jobs").select("id,job_type,status,source_menus,configuration,model_key,prompt_version,validation,error_code,created_at,completed_at").order("created_at", { ascending: false }).limit(50),
    admin.from("period_trivia_events").select("id,title,status,starts_at,ends_at,timezone,question_count,reviewed_at,reward_id").order("starts_at", { ascending: false }).limit(20),
    admin.from("period_trivia_leads").select("id,event_id,user_id,status,acquisition_source,campaign_code,created_at,last_contacted_at").order("created_at", { ascending: false }).limit(100),
    admin.from("period_content_sources").select("id", { count: "exact", head: true }),
    admin.from("period_trivia_rewards").select("id,name,description,icon,reward_type,value,is_active").eq("is_active", true).order("created_at", { ascending: false }).limit(100),
  ]);
  return NextResponse.json({ jobs: jobs ?? [], events: events ?? [], leads: leads ?? [], sourceLinks: sourceLinks ?? 0, rewards: rewards ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = GenerateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid AI generation request", details: parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  const admin = getSupabaseAdmin();
  const modelName = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o";
  const { data: job, error: jobError } = await admin.from("period_ai_jobs").insert({
    job_type: input.jobType, status: "running", source_menus: input.sourceMenus,
    configuration: {
      difficulty: input.difficulty, answerCount: input.answerCount, questionCount: 10,
      eventId: input.eventId, topic: input.topic, contentFormat: input.contentFormat,
      audience: input.audience, tone: input.tone, readingLength: input.readingLength,
      locale: input.locale, suggestionCount: input.suggestionCount,
    },
    model_key: modelName, requested_by: user.id, started_at: new Date().toISOString(),
  }).select("id").single();
  if (jobError || !job) return NextResponse.json({ error: "Unable to start an auditable AI job" }, { status: 500 });

  const started = Date.now();
  try {
    const sources = await loadSources(input.sourceMenus);
    if (sources.length < 3) throw new Error("INSUFFICIENT_APPROVED_SOURCE_CONTENT");
    await indexSources(sources);
    if (!process.env.OPENAI_API_KEY) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

    const kindRule = input.jobType === "trivia_generation"
      ? `Create exactly 10 distinct ${input.difficulty} questions. Every question must have exactly ${input.answerCount} plausible answers, one zero-based correctOption, a concise learning explanation, and sourceMenu/sourceId copied from its evidence.`
      : input.jobType === "engagement_copy"
        ? "Create 5 non-diagnostic, supportive engagement messages with alertCopy, title, summary and evidence IDs. Never infer pregnancy, disease, fertility, or sensitive identity."
        : `Create exactly ${input.suggestionCount} original Period Library ${input.jobType === "content_curation" ? "curated" : "suggested"} content drafts. Each item must include title, summary, body, 3-6 tags, a coverImageBrief, sourceMenu and sourceId. Format: ${input.contentFormat}; audience: ${input.audience}; tone: ${input.tone}; reading length: ${input.readingLength}; locale: ${input.locale}. Drafts must not claim diagnosis or treatment.`;
    const sourceContext = sources.map(({ id, menu, title, excerpt }) => ({ id, menu, title, evidence: excerpt.slice(0, 900) }));
    const prompt = `You are the governed editorial copilot for Plasence Period Tracker. ${kindRule}
Use only the approved source records below; never introduce facts not present in them. Avoid duplicates, fear-based language, diagnosis, treatment promises, pregnancy claims and personalized medical advice. Topic focus: ${input.topic || "menstrual health and healthy living"}.
SOURCE_RECORDS=${JSON.stringify(sourceContext)}`;

    const completion = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "period_ai_draft", strict: true, schema: responseSchema as any },
      },
    });
    const output = JSON.parse(completion.choices[0].message.content ?? "{}");
    const items = Array.isArray(output.items) ? output.items : [];
    if (input.jobType === "trivia_generation" && (items.length !== 10 || items.some((item: any) => item.options?.length !== input.answerCount || item.correctOption < 0 || item.correctOption >= input.answerCount))) {
      throw new Error("AI_OUTPUT_FAILED_VALIDATION");
    }
    if (["content_curation", "content_suggestion"].includes(input.jobType) && (items.length !== input.suggestionCount || items.some((item: any) => !item.title || !item.summary || !item.body))) {
      throw new Error("AI_OUTPUT_FAILED_VALIDATION");
    }
    const sourceKeys = new Set(sources.map((source) => `${source.menu}:${source.id}`));
    if (items.some((item: any) => !sourceKeys.has(`${item.sourceMenu}:${item.sourceId}`))) throw new Error("AI_OUTPUT_UNGROUNDED");
    const normalizedQuestions = new Set(items.map((item: any) => String(item.question ?? item.title ?? "").trim().toLowerCase()));
    if (normalizedQuestions.size !== items.length) throw new Error("AI_OUTPUT_DUPLICATE_ITEMS");

    if (input.jobType === "trivia_generation") {
      const rows = items.map((item: any, index: number) => ({
        event_id: input.eventId ?? null, position: input.eventId ? index + 1 : null,
        topic: String(item.topic || input.topic || "Period health"), question: item.question,
        options: item.options, correct_option: item.correctOption, explanation: item.explanation,
        difficulty: input.difficulty, status: "draft", validation_status: "valid", ai_job_id: job.id,
        source_refs: [{ menu: item.sourceMenu, id: item.sourceId }], created_by: user.id,
      }));
      const { error } = await admin.from("period_trivia_questions").insert(rows);
      if (error) throw new Error("TRIVIA_DRAFT_INSERT_FAILED");
      if (input.eventId && input.rewardId) {
        await admin.from("period_trivia_events").update({ reward_id: input.rewardId }).eq("id", input.eventId);
      }
    } else if (input.jobType !== "engagement_copy") {
      const readingMinutes = { short: 3, medium: 6, long: 10 }[input.readingLength];
      const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
      const contentRows = items.map((item: any) => ({
        title: item.title, topic: input.topic || "Period health", content_type: input.contentFormat,
        locale: input.locale, summary: item.summary,
        body_html: `<p>${escapeHtml(item.body || item.summary).replace(/\r?\n\r?\n/g, "</p><p>").replace(/\r?\n/g, "<br>")}</p>`,
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 8).map((tag: unknown) => String(tag).slice(0, 48)) : [],
        reading_minutes: readingMinutes, status: "draft", curation_type: "ai_suggested",
        ai_job_id: job.id, created_by: user.id,
        metadata: { audience: input.audience, tone: input.tone, coverImageBrief: item.coverImageBrief || null, sourceJobType: input.jobType },
      }));
      const { data: created, error } = await admin.from("period_content").insert(contentRows).select("id");
      if (error) throw new Error("CONTENT_DRAFT_INSERT_FAILED");
      const links = (created ?? []).map((row: any, index: number) => {
        const source = sources.find((candidate) => candidate.menu === items[index].sourceMenu && candidate.id === items[index].sourceId)!;
        return { period_content_id: row.id, source_menu: source.menu, source_id: source.id, source_title: source.title, source_excerpt: source.excerpt, source_snapshot_hash: Buffer.from(`${source.menu}:${source.id}:${source.excerpt}`).toString("base64url").slice(0, 64), linked_by: user.id };
      });
      if (links.length) await admin.from("period_content_sources").insert(links);
    }

    await admin.from("period_ai_jobs").update({ status: "review", output, validation: { grounded: true, unique: true, itemCount: items.length, humanReviewRequired: true }, latency_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ id: job.id, status: "review", itemCount: items.length, output });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "AI_JOB_FAILED";
    await admin.from("period_ai_jobs").update({ status: "failed", error_code: code, latency_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ error: code === "AI_PROVIDER_NOT_CONFIGURED" ? "AI generation is not configured. Add OPENAI_API_KEY before using this workflow." : "The AI draft failed validation and was not published.", code }, { status: code === "AI_PROVIDER_NOT_CONFIGURED" ? 503 : 422 });
  }
}
