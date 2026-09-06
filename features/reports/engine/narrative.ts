/**
 * Reports menu — AI narrative generation (OpenAI / ChatGPT).
 *
 * Hard separation: the model receives ONLY the deterministic metrics JSON
 * produced by collectors.ts. It can describe and compare numbers, never
 * invent them. When OPENAI_API_KEY is absent (or the definition opts out)
 * the run ships metrics-only — the menu keeps working without a provider.
 */

import type { ReportSection, ReportWindow, SectionResult } from "./types";
import { REPORT_SECTION_LABELS } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 900; // per-run narrative budget (cost guard)

export interface NarrativeResult {
  narrative_md: string;
  model: string;
}

export function narrativeProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function narrativeModel(): string {
  return process.env.REPORT_AI_MODEL || DEFAULT_MODEL;
}

function buildPrompt(
  definitionName: string,
  cadence: string,
  window: ReportWindow,
  metrics: Record<string, SectionResult>,
  anomalies: string[],
): { system: string; user: string } {
  const system = [
    "You write internal platform performance reports for the 4OurLife admin team (Ghana health-tech platform: web admin panel + mobile app).",
    "STRICT DATA RULES:",
    "- Use ONLY the numbers present in the JSON payload. Never invent, estimate or extrapolate figures.",
    "- Sections marked status 'awaiting' have no data: state that plainly using their 'note' and move on.",
    "- Every 'metrics' entry has current vs previous window values; report the movement (percent when previous > 0).",
    "- If a figure is null, say it is unavailable.",
    "TONE & FORMAT:",
    "- Markdown. Start with '## Executive Summary' (3-5 sentences), then one '## ' section per report area.",
    "- Lead with anomalies if any are provided — they are the most important facts.",
    "- Use compact bullet lists; bold key numbers; keep the whole report under 450 words.",
    "- End with '## Recommended Actions' — at most 4 concrete, low-risk operational suggestions grounded in the data.",
    "SAFETY:",
    "- No medical claims, no diagnoses, no pregnancy or fertility outcome promises — the platform never infers those.",
    "- No speculation about individual users; reports are aggregate-only.",
  ].join("\n");

  const user = [
    `Report: ${definitionName}`,
    `Cadence: ${cadence}`,
    `Period covered: ${window.start} to ${window.end} (comparison period: ${window.prevStart} to ${window.prevEnd})`,
    `Section labels: ${JSON.stringify(REPORT_SECTION_LABELS)}`,
    `Anomalies flagged by collectors (report these first): ${JSON.stringify(anomalies)}`,
    `Metrics JSON: ${JSON.stringify(metrics)}`,
  ].join("\n");

  return { system, user };
}

/**
 * Generate the narrative for a collected run. Returns null when narration
 * is unavailable (no API key, provider error) — the caller then delivers a
 * metrics-only report instead of failing.
 */
export async function generateReportNarrative(params: {
  definitionName: string;
  cadence: string;
  window: ReportWindow;
  metrics: Record<string, SectionResult>;
  anomalies: string[];
  sections: ReportSection[];
}): Promise<NarrativeResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const { system, user } = buildPrompt(
    params.definitionName,
    params.cadence,
    params.window,
    params.metrics,
    params.anomalies,
  );
  const model = narrativeModel();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[reports/narrative] OpenAI HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { narrative_md: content, model };
  } catch (err) {
    console.error(`[reports/narrative] ${(err as Error).message}`);
    return null;
  }
}

/**
 * Metrics-only markdown rendering used when narration is off or the
 * provider is unavailable — deterministic, number-for-number.
 */
export function renderMetricsOnlyMarkdown(
  definitionName: string,
  cadence: string,
  window: ReportWindow,
  metrics: Record<string, SectionResult>,
  anomalies: string[],
): string {
  const lines: string[] = [
    `## ${definitionName}`,
    `_${cadence} report · ${window.start} → ${window.end} (metrics only, AI narrative unavailable)_`,
    "",
  ];
  if (anomalies.length) {
    lines.push("### ⚠️ Flags", ...anomalies.map((a) => `- ${a}`), "");
  }
  for (const [key, result] of Object.entries(metrics)) {
    const label = REPORT_SECTION_LABELS[key as ReportSection] ?? key;
    lines.push(`### ${label}`);
    if (result.status === "awaiting") {
      lines.push(`- Awaiting data: ${result.note ?? "source not live yet."}`);
    } else {
      for (const [metric, value] of Object.entries(result.metrics)) {
        const prev =
          value.previous == null ? "" : ` (previous: ${value.previous})`;
        lines.push(`- ${metric.replace(/_/g, " ")}: **${value.current ?? "n/a"}**${prev}`);
      }
      if (result.note) lines.push(`- Note: ${result.note}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
