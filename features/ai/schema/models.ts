/**
 * The generation models an admin may choose.
 *
 * This is deliberately a curated constant, not a database table: the API
 * validates the incoming `model` against it with Zod, so an admin can only
 * ever run a model we have actually tested against our Structured Outputs
 * schema. A free-text model id reaches OpenAI and 400s at request time,
 * which surfaces to the admin as an opaque failed job.
 *
 * `ai_models` is NOT the home for this. That table is shaped for ML
 * classifier monitoring (accuracy_latest, latency_p50_ms, last_trained_at,
 * accuracy_target) and has no column for "may an admin pick this for an
 * editorial job" -- see features/ai/ui/ModelsTab.tsx.
 *
 * Adding a model: append a row here, confirm it supports
 * response_format.json_schema with strict: true, ship. That is the whole
 * change -- ui/ and api/ both read this file, per the schema/ rule in
 * CLAUDE.md.
 *
 * Model lineup checked against developers.openai.com/api/docs/models on
 * 2026-09-16. Prices in the blurbs are input-token costs at that date and
 * are there for relative ordering, not billing.
 */

export type AiModelTier = "fast" | "balanced" | "quality";

export type AiModel = {
  /** Sent to the provider verbatim, and stored in period_ai_jobs.model_key. */
  id: string;
  /** What the admin sees in the dropdown. */
  label: string;
  /** One line of "when would I pick this", shown under the select. */
  blurb: string;
  tier: AiModelTier;
  /**
   * Kept selectable only so historical jobs render with a real name and any
   * in-flight config keeps working. Grouped under "Legacy" in the dropdown;
   * do not pick one for new work.
   */
  legacy?: boolean;
};

export const AI_MODELS: readonly AiModel[] = [
  {
    id: "gpt-6-astra",
    label: "GPT-6 Astra",
    blurb:
      "Most capable, slowest, most expensive. Worth it for a trivia set or an article that will be published with a clinician's name on it.",
    tier: "quality",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    blurb:
      "High reasoning for complex editorial work — long source sets, nuanced clinical framing.",
    tier: "quality",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    blurb:
      "Balanced intelligence and cost (~$2/M input). The default for anything a clinician will review.",
    tier: "balanced",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    blurb:
      "Cheapest and fastest (~$0.20/M input). Good for bulk suggestion runs you intend to edit anyway.",
    tier: "fast",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    blurb: "Previous generation. Kept for reproducing an older job.",
    tier: "balanced",
    legacy: true,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    blurb:
      "Previous generation — what every job before 2026-09-16 ran on. Kept for reproducing an older job.",
    tier: "balanced",
    legacy: true,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    blurb: "Previous generation, cheapest of its family.",
    tier: "fast",
    legacy: true,
  },
] as const;

/**
 * Zod's z.enum needs a non-empty tuple of literals, which a .map() over
 * AI_MODELS does not give it, so the ids are spelled out once here and
 * guarded by the compile-time check below.
 */
export const AI_MODEL_IDS = [
  "gpt-6-astra",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini",
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export const DEFAULT_AI_MODEL: AiModelId = "gpt-5.6-terra";

// Fails `tsc` if AI_MODELS and AI_MODEL_IDS drift apart.
const _idsMatchRegistry: readonly AiModelId[] = AI_MODELS.map(
  (model) => model.id as AiModelId,
);
void _idsMatchRegistry;

export const CURRENT_AI_MODELS = AI_MODELS.filter((model) => !model.legacy);
export const LEGACY_AI_MODELS = AI_MODELS.filter((model) => model.legacy);

export function aiModelLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return AI_MODELS.find((model) => model.id === id)?.label ?? id;
}
