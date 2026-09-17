import { z } from "zod";
import {
  AI_MODEL_IDS,
  DEFAULT_AI_MODEL,
} from "@/features/ai/schema/models";

export const AI_STUDIO_MODULE_KEYS = [
  "exercises",
  "plans",
  "challenges",
  "workout_sessions",
  "warmup_recovery",
  "progressions",
  "communications",
  "scheduling",
  "rewards",
  "education",
  "analytics",
  "recommendations",
  "quality_safety",
  "outdoor",
] as const;

export type AiStudioModuleKey = (typeof AI_STUDIO_MODULE_KEYS)[number];

export type AiStudioContextField =
  | "audience"
  | "difficulty"
  | "duration"
  | "location"
  | "equipment"
  | "tone";

export type AiStudioModule = {
  key: AiStudioModuleKey;
  label: string;
  icon: string;
  description: string;
  destination: string;
  capabilities: readonly string[];
  contextFields: readonly AiStudioContextField[];
  outputGuide: string;
};

/**
 * One registry drives the module dropdown, the capabilities catalogue and
 * the server prompt. Adding a new Fitness AI capability therefore cannot
 * leave the admin UI claiming support that the generator does not know about.
 */
export const AI_STUDIO_MODULES: readonly AiStudioModule[] = [
  {
    key: "exercises",
    label: "Exercises",
    icon: "🏋️",
    description: "Create review-ready exercises that are missing from the catalogue.",
    destination: "Exercises catalogue",
    capabilities: [
      "Draft new exercises that are not yet in the catalogue",
      "Suggest muscle groups, equipment, difficulty, sets, reps and rest",
      "Write instructions, benefits, coaching cues and safety notes",
      "Create home, gym, outdoor and no-equipment alternatives",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include catalogue-ready name, category, primary and secondary muscles, equipment, difficulty, sets, reps or duration, rest, instructions, benefits, coaching cues and contraindication flags.",
  },
  {
    key: "plans",
    label: "Plans",
    icon: "📋",
    description: "Design structured multi-week fitness programmes for admin review.",
    destination: "Fitness Plans",
    capabilities: [
      "Draft complete multi-week workout plans",
      "Build weekly schedules around goals, available days and session length",
      "Add progressive overload, recovery and deload guidance",
      "Produce beginner, intermediate and advanced plan variants",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include duration in weeks, workouts per week, goals, target body areas, weekly structure, progression approach, recovery guidance and the exercise requirements an admin should verify.",
  },
  {
    key: "challenges",
    label: "Challenges",
    icon: "🏆",
    description: "Develop safe, measurable community fitness challenge concepts.",
    destination: "Challenges",
    capabilities: [
      "Generate challenge concepts, names and descriptions",
      "Recommend measurable goals, duration and participant rules",
      "Suggest tier eligibility, FitCoin rewards and completion criteria",
      "Create launch messaging and engagement checkpoints",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "tone"],
    outputGuide:
      "Include challenge type, goal metric and value, duration, eligibility, completion rules, reward recommendation, fairness controls and promotional copy.",
  },
  {
    key: "workout_sessions",
    label: "Workout Sessions",
    icon: "⏱️",
    description: "Create one-off sessions and reusable workout templates.",
    destination: "Plans or content schedule",
    capabilities: [
      "Create strength, cardio, HIIT, yoga and mobility sessions",
      "Fit sessions to a specific time, place and equipment level",
      "Suggest realistic exercise order, volume and rest",
      "Create circuit, interval and partner-workout formats",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include session objective, time blocks, exercise sequence, work and rest prescriptions, coaching cues, scaling options and cooldown.",
  },
  {
    key: "warmup_recovery",
    label: "Warm-up & Recovery",
    icon: "🧘",
    description: "Draft warm-ups, cooldowns, mobility and recovery routines.",
    destination: "Exercise or plan supporting content",
    capabilities: [
      "Generate activity-specific warm-ups and cooldowns",
      "Create mobility, stretching and active-recovery routines",
      "Suggest low-impact substitutions and recovery-day options",
      "Add clear stop conditions and safety reminders",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include purpose, ordered movements, time or reps, intensity guidance, modifications and safety stop conditions. Do not claim injury treatment.",
  },
  {
    key: "progressions",
    label: "Progressions & Variations",
    icon: "📈",
    description: "Create sensible regressions, progressions and programme variations.",
    destination: "Exercises and Plans",
    capabilities: [
      "Produce easier and harder versions of an exercise or workout",
      "Recommend progression across weeks",
      "Adapt content for home, gym and limited equipment",
      "Reduce repetition in rolling plans while preserving safety",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include baseline, regression, progression, readiness criteria, weekly changes and substitutions. Keep jumps in difficulty realistic.",
  },
  {
    key: "communications",
    label: "Messages & Campaigns",
    icon: "💬",
    description: "Write fitness communications for push, WhatsApp and in-app use.",
    destination: "Notifications, WhatsApp and campaigns",
    capabilities: [
      "Draft workout reminders and challenge announcements",
      "Create streak recovery and re-engagement messages",
      "Write push, WhatsApp and in-app variants",
      "Adapt tone for different user segments without sensitive inferences",
    ],
    contextFields: ["audience", "tone"],
    outputGuide:
      "Include channel-ready short and long copy, call to action, audience, timing suggestion and claims or wording that require review.",
  },
  {
    key: "scheduling",
    label: "Content Scheduling",
    icon: "📅",
    description: "Plan practical fitness publishing and engagement calendars.",
    destination: "Activity & Schedule",
    capabilities: [
      "Create weekly and monthly fitness content calendars",
      "Balance workouts, challenges, education and reminders",
      "Suggest timing and audience segments",
      "Identify content gaps and avoid message fatigue",
    ],
    contextFields: ["audience", "duration", "tone"],
    outputGuide:
      "Include a chronological schedule, content type, audience, objective, channel, suggested timing and dependencies. Avoid pretending to know unavailable user-level behaviour.",
  },
  {
    key: "rewards",
    label: "FitCoins & Rewards",
    icon: "🪙",
    description: "Recommend balanced incentives for fitness activities.",
    destination: "FitCoins and Challenges",
    capabilities: [
      "Suggest FitCoin rewards based on effort and duration",
      "Design milestone and completion incentives",
      "Flag reward structures that may be unfair or easy to exploit",
      "Propose reward descriptions and badge concepts",
    ],
    contextFields: ["audience", "difficulty", "duration"],
    outputGuide:
      "Include reward amount or range, earning rule, budget implication, anti-abuse control, eligibility and a short reward description. Clearly label estimates.",
  },
  {
    key: "education",
    label: "Education & Fitness Content",
    icon: "📚",
    description: "Draft useful fitness education for review and publishing.",
    destination: "Articles and scheduled content",
    capabilities: [
      "Write fitness tips, explainers and coaching articles",
      "Create beginner guides and exercise FAQs",
      "Draft video scripts, captions and carousel outlines",
      "Adapt reading level, tone and length",
    ],
    contextFields: ["audience", "difficulty", "duration", "tone"],
    outputGuide:
      "Include title, summary, outline, publishable draft, key takeaways, suggested visual brief and claims that need expert verification.",
  },
  {
    key: "analytics",
    label: "Analytics Summaries",
    icon: "📊",
    description: "Turn supplied aggregate metrics into plain-language admin summaries.",
    destination: "Fitness analytics",
    capabilities: [
      "Summarise completion, engagement and drop-off metrics supplied by an admin",
      "Highlight patterns and possible operational causes",
      "Create weekly management briefs",
      "Suggest questions for deeper investigation",
    ],
    contextFields: ["audience", "duration", "tone"],
    outputGuide:
      "Separate observed facts from hypotheses, cite the supplied metric or note behind each observation, and include recommended follow-up checks. Never invent measurements.",
  },
  {
    key: "recommendations",
    label: "Admin Recommendations",
    icon: "💡",
    description: "Suggest what fitness content or operational action to create next.",
    destination: "Any Fitness module",
    capabilities: [
      "Recommend the next plan, challenge or exercise to create",
      "Suggest content for underserved goals or equipment levels",
      "Propose re-engagement and retention experiments",
      "Prioritise ideas by expected value and effort",
    ],
    contextFields: ["audience", "duration", "location", "equipment"],
    outputGuide:
      "Include recommendation, evidence supplied by the admin, expected benefit, effort, dependencies, risk and a measurable success criterion.",
  },
  {
    key: "quality_safety",
    label: "Quality & Safety Review",
    icon: "🛡️",
    description: "Review supplied fitness content for quality, duplication and safety concerns.",
    destination: "Review queue",
    capabilities: [
      "Check drafts for unclear, unsafe or contradictory instructions",
      "Find likely duplicate exercises or plans",
      "Flag unrealistic volume, progression or reward rules",
      "Produce a human-review checklist",
    ],
    contextFields: ["audience", "difficulty", "equipment", "tone"],
    outputGuide:
      "Include severity, finding, affected text, why it matters, suggested correction and whether trainer or clinical review is required. Do not certify content as safe.",
  },
  {
    key: "outdoor",
    label: "Outdoor Fitness",
    icon: "🌳",
    description: "Draft outdoor workout, event and route content around verified details.",
    destination: "Outdoor routes and events",
    capabilities: [
      "Create outdoor workout and event concepts",
      "Draft route descriptions from verified route data",
      "Suggest difficulty, pacing, equipment and participant guidance",
      "Create weather, hydration and visibility checklists",
    ],
    contextFields: ["audience", "difficulty", "duration", "location", "equipment"],
    outputGuide:
      "Include event or workout concept, verified-location placeholders, difficulty, duration, participant requirements and safety checklist. Never invent GPS coordinates or claim a route is verified.",
  },
] as const;

export const AI_STUDIO_MODULE_MAP = Object.fromEntries(
  AI_STUDIO_MODULES.map((module) => [module.key, module]),
) as Record<AiStudioModuleKey, AiStudioModule>;

export const AiStudioGenerateRequestSchema = z.object({
  module: z.enum(AI_STUDIO_MODULE_KEYS),
  model: z.enum(AI_MODEL_IDS).default(DEFAULT_AI_MODEL),
  quantity: z.number().int().min(1).max(12).default(3),
  topic: z.string().trim().min(3).max(240),
  goal: z.string().trim().max(500).optional(),
  audience: z.string().trim().max(120).default("General fitness users"),
  difficulty: z
    .enum(["not_applicable", "beginner", "intermediate", "advanced", "mixed"])
    .default("mixed"),
  duration: z.string().trim().max(80).optional(),
  location: z
    .enum(["not_applicable", "any", "home", "gym", "outdoor"])
    .default("any"),
  equipment: z.string().trim().max(240).optional(),
  tone: z
    .enum(["supportive", "motivating", "educational", "concise", "professional"])
    .default("supportive"),
  instructions: z.string().trim().max(2000).optional(),
});

export type AiStudioGenerateRequest = z.infer<
  typeof AiStudioGenerateRequestSchema
>;

export const AiStudioDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  fields: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
  implementation_notes: z.array(z.string()),
  safety_notes: z.array(z.string()),
  tags: z.array(z.string()),
});

export type AiStudioDraft = z.infer<typeof AiStudioDraftSchema>;

export const AiStudioOutputSchema = z.object({
  items: z.array(AiStudioDraftSchema).min(1).max(12),
});

export type AiStudioGenerateResponse = {
  module: AiStudioModuleKey;
  model: string;
  providerModel: string;
  generatedAt: string;
  items: AiStudioDraft[];
};

/** OpenAI Structured Outputs schema matching AiStudioOutputSchema. */
export const AI_STUDIO_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
              additionalProperties: false,
            },
          },
          implementation_notes: {
            type: "array",
            items: { type: "string" },
          },
          safety_notes: {
            type: "array",
            items: { type: "string" },
          },
          tags: { type: "array", items: { type: "string" } },
        },
        required: [
          "title",
          "summary",
          "fields",
          "implementation_notes",
          "safety_notes",
          "tags",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;
