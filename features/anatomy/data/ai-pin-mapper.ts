import OpenAI from "openai";
import { getAdminClient } from "@/lib/db/admin";

/**
 * AI Pin Mapper (Gap Analysis Part AL, AL-D8).
 *
 * Reads article content from Diseases & Conditions / Symptoms / Healthy
 * Living / Fitness, asks the LLM which canonical body parts each article
 * affects, and stores the suggestions in ai_body_part_mappings as
 * `proposed`. NOTHING is auto-published: junction rows are only written
 * after an admin approves a suggestion (decideMapping).
 *
 * OpenAI pattern mirrors features/fitness/data/generate-plan.ts (structured outputs,
 * retry with backoff, cost awareness).
 */

export type MappingContentType = "condition" | "symptom" | "tip" | "workout" | "drug";

interface ContentSource {
  table: string;
  junction: string;
  junctionContentCol: string;
  label: string;
  sourceColumn?: string;
}

const SOURCES: Record<MappingContentType, ContentSource> = {
  condition: {
    table: "conditions",
    junction: "condition_body_parts",
    junctionContentCol: "condition_id",
    label: "Diseases & Conditions",
    sourceColumn: "source",
  },
  symptom: {
    table: "symptoms",
    junction: "symptom_body_parts",
    junctionContentCol: "symptom_id",
    label: "Symptoms",
    sourceColumn: "source",
  },
  tip: {
    table: "healthy_living_info",
    junction: "healthy_living_body_parts",
    junctionContentCol: "tip_id",
    label: "Healthy Living",
    sourceColumn: "source",
  },
  workout: {
    // NOTE: the fitness catalog table is `fitness_exercises`; the junction
    // column is still named workout_id for historical reasons.
    table: "fitness_exercises",
    junction: "fitness_body_parts",
    junctionContentCol: "workout_id",
    label: "Fitness",
    sourceColumn: "source",
  },
  drug: {
    table: "drugs",
    junction: "drug_body_parts",
    junctionContentCol: "drug_id",
    label: "Drugs",
  },
};

export const MAX_BATCH_SIZE = 25;
const TEXT_CAP = 1200;

interface AiMappingItem {
  content_id: string;
  body_part_ids: string[];
  confidence: number;
  rationale: string;
}

export interface AiMapRunResult {
  ok: boolean;
  error?: string;
  scanned?: number;
  proposed?: number;
  skipped?: number;
  model?: string;
  estimatedInputTokens?: number;
}

/** Extracts a compact plain-text digest of a content row for the prompt. */
function rowDigest(row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") continue;
    if (typeof value === "string" && value.trim()) {
      parts.push(`${key}: ${value.trim()}`);
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  return parts.join("\n").slice(0, TEXT_CAP);
}

export async function runAiPinMapping(opts: {
  contentType: MappingContentType;
  unmappedOnly: boolean;
  batchSize: number;
}): Promise<AiMapRunResult> {
  const source = SOURCES[opts.contentType];
  if (!source) return { ok: false, error: "Unknown content type." };

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o";
  if (!openaiApiKey) {
    return { ok: false, error: "OpenAI API key missing (OPENAI_API_KEY)." };
  }

  const admin = getAdminClient();
  const batchSize = Math.min(Math.max(opts.batchSize || 10, 1), MAX_BATCH_SIZE);

  // ── Body-part vocabulary (the only ids the model may return) ──
  const { data: vocabRows, error: vocabError } = await admin
    .from("body_parts")
    .select("id, name, body_system")
    .limit(400);
  if (vocabError || !vocabRows || vocabRows.length === 0) {
    return { ok: false, error: "Body-part vocabulary unavailable." };
  }
  const vocab = new Map<string, string>(vocabRows.map((v) => [v.id, v.name]));

  // ── Candidate content rows ──
  let contentQuery = admin.from(source.table).select("*").limit(batchSize * 4);
  if (opts.contentType === "workout") contentQuery = contentQuery.eq("is_active", true);
  if (opts.contentType === "drug") contentQuery = contentQuery.eq("status", "active");
  const { data: contentRows, error: contentError } = await contentQuery;
  if (contentError) {
    return {
      ok: false,
      error: `Failed to read ${source.table}: ${contentError.message}`,
    };
  }

  let candidates = (contentRows ?? []) as Record<string, unknown>[];

  // Exclude rows already linked to any body part.
  if (opts.unmappedOnly && candidates.length > 0) {
    const { data: junctionRows, error: junctionError } = await admin
      .from(source.junction)
      .select(source.junctionContentCol)
      .limit(5000);
    if (junctionError) {
      return {
        ok: false,
        error:
          "Junction table missing — apply the Part AL migration first. " +
          junctionError.message,
      };
    }
    const mapped = new Set(
      ((junctionRows ?? []) as unknown as Record<string, unknown>[]).map(
        (r) => r[source.junctionContentCol] as string,
      ),
    );
    candidates = candidates.filter((c) => !mapped.has(c.id as string));
  }

  // Exclude content already in the review queue (any status).
  if (candidates.length > 0) {
    const { data: queued } = await admin
      .from("ai_body_part_mappings")
      .select("content_id")
      .eq("content_type", opts.contentType)
      .limit(5000);
    const queuedIds = new Set((queued ?? []).map((q) => q.content_id as string));
    candidates = candidates.filter((c) => !queuedIds.has(c.id as string));
  }

  candidates = candidates.slice(0, batchSize);
  if (candidates.length === 0) {
    return { ok: true, scanned: 0, proposed: 0, skipped: 0, model: modelName };
  }

  // ── Prompt ──
  const vocabulary = vocabRows.map(
    (v) => `${v.id} | ${v.name}${v.body_system ? ` (${v.body_system})` : ""}`,
  );
  const articles = candidates.map((c) => ({
    id: c.id,
    digest: rowDigest(c),
  }));

  const prompt = `
You are a medical knowledge engineer for a health education platform. For each article below, identify the human body parts it primarily affects or relates to, using ONLY the provided body-part vocabulary ids.

== BODY-PART VOCABULARY (id | name) ==
${vocabulary.join("\n")}

== RULES ==
1. Return ONLY ids from the vocabulary above. Never invent ids.
2. 1–4 body parts per article; prefer the most specific part (e.g. "liver" over "abdomen") unless the article is genuinely general.
3. confidence = your certainty that the mapping is correct (0–1). Use < 0.6 when the article only implies the body part indirectly.
4. rationale = one short sentence citing the text evidence.
5. If an article matches no body part, return an empty body_part_ids array for it.

== ARTICLES (JSON: id + text digest) ==
${JSON.stringify(articles)}
  `.trim();

  const estimatedInputTokens = Math.round(prompt.length / 4);

  // ── OpenAI call (structured output + retry, mirrors generate-plan.ts) ──
  const openai = new OpenAI({ apiKey: openaiApiKey });
  let parsed: AiMappingItem[] | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "body_part_mappings",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                mappings: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      content_id: { type: "string" },
                      body_part_ids: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                      rationale: { type: "string" },
                    },
                    required: [
                      "content_id",
                      "body_part_ids",
                      "confidence",
                      "rationale",
                    ],
                  },
                },
              },
              required: ["mappings"],
            },
          },
        },
        temperature: 0.2,
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const json = JSON.parse(raw) as { mappings?: AiMappingItem[] };
      parsed = Array.isArray(json.mappings) ? json.mappings : [];
      break;
    } catch (err) {
      console.error(`[ai-pin-mapper] attempt ${attempt} failed:`, err);
      if (attempt === 2) {
        return { ok: false, error: "OpenAI request failed. See server logs." };
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!parsed) return { ok: false, error: "OpenAI request failed." };

  // ── Validate + store as proposals (never auto-publish) ──
  const candidateIds = new Set(candidates.map((c) => c.id as string));
  const rows = parsed
    .filter((m) => candidateIds.has(m.content_id))
    .flatMap((m) =>
      (m.body_part_ids ?? [])
        .filter((bp) => vocab.has(bp))
        .map((bp) => ({
          content_type: opts.contentType,
          content_id: m.content_id,
          body_part_id: bp,
          confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0)),
          rationale: (m.rationale ?? "").slice(0, 500),
          status: "proposed",
          model: modelName,
        })),
    );

  let proposed = 0;
  let skipped = 0;
  for (const row of rows) {
    const { error } = await admin
      .from("ai_body_part_mappings")
      .upsert(row, {
        onConflict: "content_type,content_id,body_part_id",
        ignoreDuplicates: true,
      });
    if (error) skipped++;
    else proposed++;
  }

  return {
    ok: true,
    scanned: candidates.length,
    proposed,
    skipped,
    model: modelName,
    estimatedInputTokens,
  };
}

/**
 * Approve / reject a proposed mapping. Approval writes the junction row
 * (source='ai') so the pin appears in the mobile explorer immediately.
 */
export async function decideMapping(opts: {
  mappingId: string;
  decision: "approved" | "rejected";
  reviewerId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient();

  const { data: mapping, error: fetchError } = await admin
    .from("ai_body_part_mappings")
    .select("*")
    .eq("id", opts.mappingId)
    .single();
  if (fetchError || !mapping) {
    return { ok: false, error: "Mapping not found." };
  }
  if (mapping.status !== "proposed") {
    return { ok: false, error: "Mapping was already reviewed." };
  }

  if (opts.decision === "approved") {
    const source = SOURCES[mapping.content_type as MappingContentType];
    if (!source) return { ok: false, error: "Unknown content type." };
    const linkPayload: Record<string, unknown> = {
      [source.junctionContentCol]: mapping.content_id,
      body_part_id: mapping.body_part_id,
    };
    if (source.sourceColumn) linkPayload[source.sourceColumn] = "ai";
    const { error: linkError } = await admin
      .from(source.junction)
      .upsert(linkPayload, {
        onConflict: `${source.junctionContentCol},body_part_id`,
        ignoreDuplicates: true,
      });
    if (linkError) {
      return {
        ok: false,
        error: `Failed to write junction link: ${linkError.message}`,
      };
    }
  }

  const { error: updateError } = await admin
    .from("ai_body_part_mappings")
    .update({
      status: opts.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts.reviewerId,
    })
    .eq("id", opts.mappingId);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  return { ok: true };
}
