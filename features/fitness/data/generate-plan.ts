import OpenAI from "openai";
import { getAdminClient } from "@/lib/db/admin";

// ─── OpenAI Structured Outputs Schema ──────────────────────────────────────────
// Translated from the previous Gemini SchemaType DSL. OpenAI's strict mode
// (json_schema.strict: true) requires every property in `properties` to
// also appear in `required` and `additionalProperties: false` on every
// object level — stricter than Gemini's partial `required` arrays, where
// e.g. `focus` and `muscles_targeted` were optional. Fields that were
// optional under Gemini (focus, muscles_targeted) are now always-required
// but can hold an empty string/array when there's nothing meaningful to
// say, rather than being omitted — functionally equivalent for this use
// case, no nullable unions needed.

export const fitnessPlanSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: {
      type: "string",
      description: "A highly motivating overview of the plan's methodology.",
    },
    duration_weeks: { type: "number" },
    days_per_week: { type: "number" },
    weekly_schedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          week: { type: "number" },
          focus: {
            type: "string",
            description: "The overarching goal of this specific week.",
          },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_name: {
                  type: "string",
                  description: "e.g., 'Monday', 'Tuesday', or 'Day 1'",
                },
                session_type: {
                  type: "string",
                  description:
                    "e.g., 'Upper Body Push', 'Active Recovery', 'Rest'",
                },
                duration_minutes: { type: "number" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description:
                          "The exact UUID from the provided library.",
                      },
                      name: { type: "string" },
                      sets: { type: "number" },
                      reps: {
                        type: "string",
                        description: "e.g., '8-10', 'To Failure', '30 sec'",
                      },
                      rest_seconds: { type: "number" },
                      coach_notes: {
                        type: "string",
                        description:
                          "Pro tip for biomechanics, breathing, or intent.",
                      },
                      met_value: {
                        type: "number",
                        description: "The MET value provided in the library.",
                      },
                      muscles_targeted: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: [
                      "id",
                      "name",
                      "sets",
                      "reps",
                      "rest_seconds",
                      "coach_notes",
                      "met_value",
                      "muscles_targeted",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "day_name",
                "session_type",
                "duration_minutes",
                "exercises",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["week", "focus", "days"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "title",
    "summary",
    "duration_weeks",
    "days_per_week",
    "weekly_schedule",
  ],
  additionalProperties: false,
};

// Manually-maintained per-1K-token estimate, not billed truth — update if
// OpenAI's pricing changes or the model changes. USD.
const OPENAI_PRICING_PER_1K: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 0.0025, out: 0.01 },
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
};

function estimateCost(
  modelName: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
): number | null {
  const rates = OPENAI_PRICING_PER_1K[modelName];
  if (!rates || promptTokens == null || completionTokens == null) return null;
  return (promptTokens * rates.in + completionTokens * rates.out) / 1000;
}

async function logAiCall(
  admin: ReturnType<typeof getAdminClient>,
  params: {
    userId?: string;
    modelName: string;
    prompt: string;
    responseTimeMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    status: "success" | "error" | "timeout";
    errorMessage?: string;
  },
) {
  const { error } = await admin.from("fitness_ai_calls").insert({
    user_id: params.userId ?? null,
    model_name: params.modelName,
    // Truncated — the full prompt includes the entire exercise-library
    // JSON dump and can be many KB, not useful to store in full.
    prompt_snippet: params.prompt.slice(0, 500),
    response_time_ms: params.responseTimeMs,
    token_usage: params.totalTokens ?? null,
    estimated_cost: estimateCost(
      params.modelName,
      params.promptTokens,
      params.completionTokens,
    ),
    status: params.status,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("[fitness-generate] fitness_ai_calls insert error:", error.message);
  }
}

// ─── Equipment Mapping ────────────────────────────────────────────────────────

// Maps the mobile onboarding `equipment_access` single-choice value to the
// `equipment_required` strings stored on fitness_exercises. Mobile users never
// set a granular `equipment` array; they only pick one of these three access
// levels, so exercise filtering must derive allowed gear from that value.
//
// These strings previously didn't match any real fitness_exercises.equipment_required
// value ("No Equipment" had 2 rows, "Yoga/ Exercise Mat" had 0 — the real values
// are "Bodyweight"/"Yoga Mat"/etc.), so no_equipment and basic users were
// generating plans from a nearly-empty pool. Corrected to the live values
// (confirmed via a distribution query against fitness_exercises on 2026-09-08).
export const equipmentAccessMap: Record<string, string[]> = {
  no_equipment: ["Bodyweight", "Yoga Mat", "No Equipment"],
  basic: ["Bodyweight", "Yoga Mat", "No Equipment", "Dumbbell", "Resistance Band"],
  full_gym: [
    "Bodyweight",
    "Yoga Mat",
    "No Equipment",
    "Dumbbell",
    "Resistance Band",
    "Barbell",
    "Kettlebell",
    "TRX/Suspension Trainer",
    "Cable Machine",
    "Box/Jump Box",
    "Smith Machine",
    "Pull-up Bar",
    "Foam Roller",
    "Stability Ball",
    "Medicine Ball",
    "Battle Ropes",
    "Sled/Prowler",
    "Ab Wheel",
    "Rowing Machine",
  ],
};

// Kept for backwards compatibility with any callers still passing the legacy
// `equipment` array. Prefer `equipmentAccessMap` for new code.
export const equipmentMap: Record<string, string[]> = {
  bodyweight_only: equipmentAccessMap.no_equipment,
  dumbbells: ["Dumbbell", "Bodyweight", "Yoga Mat", "No Equipment"],
  resistance_bands: ["Resistance Band", "Bodyweight", "Yoga Mat", "No Equipment"],
  full_gym: equipmentAccessMap.full_gym,
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Maps an AI-written session_type string to a coarse category the mobile
 * client uses to pick an icon + accent color for that day.
 * Deliberately loose keyword matching since the AI's session_type wording
 * isn't constrained to a fixed enum.
 */
export function deriveDayCategory(
  sessionType: string,
  isRest: boolean,
): string {
  if (isRest) return "rest";
  const t = sessionType.toLowerCase();
  if (t.includes("recovery") || t.includes("mobility") || t.includes("stretch"))
    return "recovery";
  if (t.includes("cardio") || t.includes("run") || t.includes("conditioning"))
    return "cardio";
  if (t.includes("pull") || t.includes("back") || t.includes("bicep"))
    return "strength_upper_pull";
  if (
    t.includes("push") ||
    t.includes("chest") ||
    t.includes("shoulder") ||
    t.includes("tricep")
  )
    return "strength_upper_push";
  if (
    t.includes("lower") ||
    t.includes("leg") ||
    t.includes("glute") ||
    t.includes("quad")
  )
    return "strength_lower";
  if (t.includes("full body")) return "strength_full_body";
  return "strength_upper_push"; // reasonable default rather than leaving null
}

const WEEKDAY_NAME_TO_NUMBER: Record<string, number> = {
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  sunday: 7,
  sun: 7,
};

/**
 * Resolves a plan day's 1-7 week position (Monday=1 ... Sunday=7) from the
 * AI's `day_name` field ("Monday", "Tue", ...) rather than trusting the
 * day's position in the `days` array. The prompt asks the model for exactly
 * 7 entries per week including rest placeholders, but that isn't enforced
 * by the JSON schema (OpenAI's structured-outputs strict mode doesn't
 * support minItems/maxItems on arrays) — when the model omits rest days
 * from the array instead of including them as "Rest" entries, array index
 * silently stops corresponding to the real weekday. Falls back to the
 * array index (matching the previous behavior) when day_name doesn't
 * parse as a real weekday, e.g. the schema's own "Day 1" fallback format.
 */
export function resolveDayNumber(
  dayName: string | undefined,
  fallbackIndex: number,
): number {
  const key = (dayName ?? "").trim().toLowerCase();
  return WEEKDAY_NAME_TO_NUMBER[key] ?? fallbackIndex + 1;
}

/**
 * Builds a short (2-3 word) style tag for the plan card.
 * Heuristic from onboarding inputs; admin/trainer plans set this manually instead.
 */
export function deriveStyleTag(selections: any): string {
  const location = selections.workout_locations?.[0];
  const locationLabel =
    location === "gym"
      ? "Gym"
      : location === "home"
        ? "Home"
        : location === "outdoor"
          ? "Outdoor"
          : "Fitness";
  const shapeLabel = (selections.target_body_shape || "Athletic")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
  return `${locationLabel} ${shapeLabel}`.trim();
}

// ─── Selection Hash ─────────────────────────────────────────────────────────────

/**
 * Deterministic selection hash — ported byte-for-byte from
 * 4-Our-Life-App/store/use-fitness-store.ts so hashes computed on either
 * side of the fence (mobile onboarding vs. admin AI-generate form) are
 * comparable, letting admin-crafted plans match a real user's onboarding
 * profile when admin generation wants reusable-plan deduplication.
 *
 * Do not import this from the mobile repo's path ("@/store/use-fitness-store")
 * — that alias resolves within the mobile app only and does not exist in
 * this repo; doing so throws a module-not-found error on every request.
 *
 * Health-specific fields (age, weight, height) are intentionally EXCLUDED
 * so body metrics don't prevent cache hits for users with identical
 * workout preferences — also why the admin form never collects them. Mobile
 * user regeneration passes allowCache=false, so this hash is a profile
 * fingerprint there rather than a "return the same plan" key.
 */
export function buildSelectionHash(s: any): string {
  const key = [
    [...(s.fitness_goals ?? [])].sort().join(","),
    s.fitness_level ?? "",
    String(s.workout_weeks ?? ""),
    [...(s.workout_days ?? [])].sort().join(","),
    String(s.workout_duration ?? ""),
    [...(s.equipment ?? [])].sort().join(","),
    [...(s.focus_areas ?? [])].sort().join(","),
    s.body_type ?? "",
    s.target_body_shape ?? "",
    [...(s.workout_locations ?? [])].sort().join(","),
    s.equipment_access ?? "",
    [...(s.workout_types ?? [])].sort().join(","),
  ].join("|");
  // Simple djb2 hash (no crypto needed — it just needs to be deterministic)
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash >>>= 0; // keep unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}

// ─── Core Generation Logic ────────────────────────────────────────────────────

export interface GenerationOptions {
  selections: any;
  selection_hash: string;
  authorId?: string; // admin's user_id, undefined for mobile onboarding
  authorType: "ai" | "admin";
  // Who to attribute this AI call to for fitness_ai_calls logging — distinct
  // from authorId, which specifically means "admin who authored this plan"
  // and is intentionally undefined for mobile/AI-originated plans. userId
  // is always the actual caller (the mobile user, or the admin who
  // triggered generation) and is always known at both call sites.
  userId?: string;
  // Admin plan generation can still reuse a matching reusable plan. Mobile
  // regeneration should pass false so the same profile hash does not trap a
  // user on the same plan forever.
  allowCache?: boolean;
  // Mobile regeneration uses the user's existing assignment history to ask
  // the model for a continuation/rotation instead of a repeat.
  avoidUserPlanHistory?: boolean;
  historyPlanLimit?: number;
}

export interface GenerationResult {
  planId: string | null;
  selection_hash: string;
  cached: boolean;
  error?: string;
}

interface UserPlanHistoryContext {
  planIds: string[];
  exerciseIds: Set<string>;
}

async function fetchUserPlanHistoryContext(
  admin: ReturnType<typeof getAdminClient>,
  userId: string | undefined,
  limit: number,
): Promise<UserPlanHistoryContext> {
  if (!userId) return { planIds: [], exerciseIds: new Set() };

  const { data: assignments, error: assignmentsError } = await admin
    .from("fitness_user_assignments")
    .select("plan_id, started_at, status")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (assignmentsError) {
    console.warn(
      "[fitness-generate] Previous plan lookup failed:",
      assignmentsError.message,
    );
    return { planIds: [], exerciseIds: new Set() };
  }

  const planIds = [
    ...new Set(
      (assignments ?? [])
        .map((assignment: any) => assignment.plan_id)
        .filter(Boolean),
    ),
  ];

  if (planIds.length === 0) return { planIds, exerciseIds: new Set() };

  const { data: previousExercises, error: exercisesError } = await admin
    .from("fitness_plan_exercises")
    .select("exercise_id")
    .in("plan_id", planIds);

  if (exercisesError) {
    console.warn(
      "[fitness-generate] Previous exercise lookup failed:",
      exercisesError.message,
    );
    return { planIds, exerciseIds: new Set() };
  }

  return {
    planIds,
    exerciseIds: new Set(
      (previousExercises ?? [])
        .map((row: any) => row.exercise_id)
        .filter(Boolean),
    ),
  };
}

/**
 * Core plan generation logic - shared between mobile onboarding and admin panel.
 *
 * @param options - Generation configuration
 * @returns Generation result with plan ID or error
 */
export async function generateFitnessPlan(
  options: GenerationOptions,
): Promise<GenerationResult> {
  const {
    selections,
    selection_hash,
    authorId,
    authorType,
    userId,
    allowCache = true,
    avoidUserPlanHistory = false,
    historyPlanLimit = 4,
  } = options;
  const admin = getAdminClient();

  // ── Cache check ──
  if (allowCache) {
    const { data: cachedPlan, error: cachedPlanError } = await admin
      .from("fitness_plans")
      .select("id")
      .eq("selection_hash", selection_hash)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedPlanError) {
      console.warn(
        "[fitness-generate] Cache lookup failed:",
        cachedPlanError.message,
      );
    }

    if (cachedPlan?.id) {
      return {
        planId: cachedPlan.id,
        selection_hash,
        cached: true,
      };
    }
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o";

  if (!openaiApiKey) {
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "OpenAI API key missing",
    };
  }

  // ── Fetch available exercises ──
  // Determine allowed equipment. Mobile onboarding supplies only
  // `equipment_access`, so that takes precedence. The legacy `equipment`
  // array is still supported for any admin callers that pass it.
  const accessLevel = selections.equipment_access;
  const allowedEquipment = accessLevel
    ? equipmentAccessMap[accessLevel] || equipmentAccessMap.no_equipment
    : selections.equipment?.flatMap((eq: string) => equipmentMap[eq] || []) ||
      equipmentAccessMap.no_equipment;
  const uniqueEquipment = [...new Set(allowedEquipment)];

  let exerciseQuery = admin
    .from("fitness_exercises")
    .select(
      "id, exercise_name, category, primary_muscle_group, secondary_muscles, equipment_required, difficulty_level, default_sets, default_reps_duration, rest_time_seconds, description, video_url, thumbnail_url, met_value",
    )
    .eq("is_active", true)
    .eq("status", "published");

  if (uniqueEquipment.length > 0 && accessLevel !== "full_gym") {
    exerciseQuery = exerciseQuery.in(
      "equipment_required",
      uniqueEquipment as string[],
    );
  }

  const { data: dbExercises, error: dbError } = await exerciseQuery;
  if (dbError) {
    console.error("[fitness-generate] DB fetch error:", dbError.message);
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "Failed to fetch exercises from database",
    };
  }

  if (!dbExercises || dbExercises.length === 0) {
    return {
      planId: null,
      selection_hash,
      cached: false,
      error:
        "No exercises match your preferences. Try adjusting equipment or locations.",
    };
  }

  const availableExercisesContext = dbExercises.map((e: any) => ({
    id: e.id,
    name: e.exercise_name,
    category: e.category,
    primary_muscle: e.primary_muscle_group,
    secondary_muscles: e.secondary_muscles,
    equipment: e.equipment_required,
    difficulty: e.difficulty_level,
    met_value: e.met_value || 5.0, // Fallback MET if null in DB
  }));

  const previousPlanContext = avoidUserPlanHistory
    ? await fetchUserPlanHistoryContext(admin, userId, historyPlanLimit)
    : { planIds: [], exerciseIds: new Set<string>() };
  const previousExerciseNames = dbExercises
    .filter((e: any) => previousPlanContext.exerciseIds.has(e.id))
    .map((e: any) => e.exercise_name)
    .slice(0, 80);
  const hasPreviousPlanContext =
    previousPlanContext.planIds.length > 0 ||
    previousPlanContext.exerciseIds.size > 0;

  const rollingPlanInstructions = hasPreviousPlanContext
    ? `
== ROLLING PLAN CONTEXT ==
This user is regenerating after already receiving ${previousPlanContext.planIds.length} previous plan(s).
Recently used exercise names: ${previousExerciseNames.join(", ") || "Unavailable"}.
Recently used exercise IDs: ${[...previousPlanContext.exerciseIds].slice(0, 120).join(", ")}.

Treat this as the NEXT plan in the user's fitness journey:
- Keep the user's current selections as the source of truth for goals, level, equipment, schedule, and duration.
- Do not return the same plan structure or the same dominant exercise rotation.
- Prefer exercises that are not in the recently used list when the library allows it.
- If a repeat is necessary for safety, equipment limits, or skill progression, change the placement, reps, sets, rest, or coaching intent so it feels like progression instead of duplication.
- Maintain realistic progression for the user's level; do not overcorrect into an advanced plan just to be different.
`.trim()
    : `
== ROLLING PLAN CONTEXT ==
No previous generated plan was found for this user. Generate from the user's current selections only.
`.trim();

  const availableExercisesWithHistory = availableExercisesContext.map((e) => ({
    ...e,
    recently_used: previousPlanContext.exerciseIds.has(e.id),
  }));

  // ── Call OpenAI ──
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const workoutWeeks = selections.workout_weeks || 2;
  const sessionMinutes = selections.workout_duration || 45;
  const workoutDaysList =
    selections.workout_days?.length > 0
      ? selections.workout_days.join(", ")
      : "3 days per week";
  const targetDaysCount = selections.workout_days?.length || 3;

  const userPrompt = `
You are an elite Strength & Conditioning Coach and biomechanics expert. Your task is to design a highly personalized, scientifically-backed fitness program.

== USER PROFILE ==
- Goals: ${selections.fitness_goals?.join(", ") || "General Fitness"}
- Fitness Level: ${selections.fitness_level}
- Target Shape: ${selections.target_body_shape || "Athletic"}
- Duration: ${workoutWeeks} Weeks program
- Weekly Schedule: ${workoutDaysList} (Total ${targetDaysCount} active days/week)
- Session Time: ${sessionMinutes} minutes per workout
- Locations: ${selections.workout_locations?.join(", ") || "Gym"}

== RULES & CONSTRAINTS ==
1. NO HALLUCINATIONS: You MUST strictly select exercises from the provided JSON library below. Use the exact "id" and "name". 
2. PERIODIZATION & PROGRESSIVE OVERLOAD: The plan MUST exactly span ${workoutWeeks} weeks. Subsequent weeks must demonstrate progressive overload (e.g., adding a set, increasing rep range, or decreasing rest time).
3. SCHEDULE MAPPING: You must provide exactly 7 days for every week. Assign the active workouts to the exact days listed in the user's Weekly Schedule (${workoutDaysList}). All other days must be labeled as "Rest" or "Active Recovery" with 0 duration and empty exercise arrays.
4. PACING: Active days should have an appropriate number of exercises to realistically fit into a ${sessionMinutes}-minute window (approx. ${Math.max(4, Math.round(sessionMinutes / 8))} exercises).
5. COACHING: Provide high-value, specific "coach_notes" for each exercise.

${rollingPlanInstructions}

== LIBRARY OF AVAILABLE EXERCISES ==
${JSON.stringify(availableExercisesWithHistory)}
  `.trim();

  // ── Retry Logic (Exponential Backoff) ──
  // Retries now cover three failure modes, not just the API call itself: an
  // unparseable response, and a *parseable but incomplete* one (fewer weeks
  // than requested), are treated as failed attempts too. Previously a
  // successful-but-truncated response (e.g. 3 weeks back for an 8-week
  // request) skipped the retry loop entirely and got silently persisted as
  // a "published" plan with entire weeks missing — see resolveDayNumber's
  // comment for the related day-of-week bug this was compounding.
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1500;
  const callStartedAt = Date.now();

  let completion: OpenAI.Chat.Completions.ChatCompletion | undefined;
  let fitnessPlan: any;
  let lastErrorMessage = "AI Generation failed unexpectedly.";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let attemptCompletion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      attemptCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: userPrompt }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "fitness_plan",
            strict: true,
            schema: fitnessPlanSchema as any,
          },
        },
      });
    } catch (error: any) {
      console.warn(
        `[fitness-generate] OpenAI attempt ${attempt} failed:`,
        error.message,
      );
      lastErrorMessage = error.message;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`[fitness-generate] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      continue;
    }

    completion = attemptCompletion; // kept even on a later failure so usage/cost still logs

    let attemptPlan: any;
    try {
      attemptPlan = JSON.parse(attemptCompletion.choices[0].message.content ?? "");
    } catch (error: any) {
      console.warn(
        `[fitness-generate] Attempt ${attempt} JSON parsing failed:`,
        error.message,
      );
      lastErrorMessage = "Failed to process the AI response.";
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`[fitness-generate] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      continue;
    }

    const weeksReturned = attemptPlan?.weekly_schedule?.length ?? 0;
    if (weeksReturned < workoutWeeks) {
      console.warn(
        `[fitness-generate] Attempt ${attempt} returned an incomplete plan: ${weeksReturned}/${workoutWeeks} weeks`,
      );
      lastErrorMessage = `AI returned an incomplete plan (${weeksReturned}/${workoutWeeks} weeks).`;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`[fitness-generate] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      continue;
    }

    fitnessPlan = attemptPlan;
    break; // Success!
  }

  const responseTimeMs = Date.now() - callStartedAt;

  if (!fitnessPlan) {
    console.error(
      "[fitness-generate] All retry attempts exhausted:",
      lastErrorMessage,
    );
    await logAiCall(admin, {
      userId,
      modelName,
      prompt: userPrompt,
      responseTimeMs,
      promptTokens: completion?.usage?.prompt_tokens,
      completionTokens: completion?.usage?.completion_tokens,
      totalTokens: completion?.usage?.total_tokens,
      status: "error",
      errorMessage: lastErrorMessage,
    });
    return {
      planId: null,
      selection_hash,
      cached: false,
      error:
        "AI Generation is currently experiencing high demand. Please try again in a moment.",
    };
  }

  await logAiCall(admin, {
    userId,
    modelName,
    prompt: userPrompt,
    responseTimeMs,
    promptTokens: completion?.usage?.prompt_tokens,
    completionTokens: completion?.usage?.completion_tokens,
    totalTokens: completion?.usage?.total_tokens,
    status: "success",
  });

  const exerciseMap = new Map(dbExercises.map((e: any) => [e.id, e]));

  // ── Insert fitness_plans row ──
  const styleTag = deriveStyleTag(selections);
  const { data: insertedPlan, error: planInsertError } = await admin
    .from("fitness_plans")
    .insert({
      title: fitnessPlan.title,
      description: fitnessPlan.summary, // summary column dropped — description is the single source now
      difficulty_level: selections.fitness_level,
      duration_weeks: fitnessPlan.duration_weeks,
      workouts_per_week: targetDaysCount, // days_per_week column dropped — this is the single source now
      target_body_parts: selections.focus_areas || [],
      goals: selections.fitness_goals || [],
      style_tag: styleTag,
      author_type: authorType,
      author_id: authorId || null,
      status: "published",
      selection_hash,
    })
    .select("id")
    .single();

  if (planInsertError || !insertedPlan?.id) {
    console.error(
      "[fitness-generate] fitness_plans insert error:",
      planInsertError?.message,
    );
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "Failed to save the generated plan.",
    };
  }

  const planId = insertedPlan.id as string;

  // ── Insert plan days and exercises ──
  // Only ACTIVE (non-rest) days get a fitness_plan_days row — a plan with
  // workouts_per_week = 3 must produce exactly 3 rows per week, not 7 with
  // 4 marked is_rest. day_number is the AI's true weekday-in-week position
  // (1-7, gaps allowed), resolved from day_name via resolveDayNumber rather
  // than the day's position in the array — see that function's comment for
  // why array index alone silently breaks the calendar mapping.
  const planExerciseRows: any[] = [];

  for (const week of fitnessPlan.weekly_schedule as any[]) {
    for (const [dayIdx, day] of (week.days as any[]).entries()) {
      const dayNumber = resolveDayNumber(day.day_name, dayIdx);
      const isRest =
        day.session_type === "Rest" ||
        !day.exercises ||
        day.exercises.length === 0;

      if (isRest) continue; // no row at all for rest days

      const targetMuscles = Array.from(
        new Set(
          (day.exercises || []).flatMap((ex: any) => {
            const dbEx: any = exerciseMap.get(ex.id || "");
            return [dbEx?.primary_muscle_group, dbEx?.secondary_muscles].filter(
              Boolean,
            );
          }),
        ),
      ) as string[];

      const { data: insertedDay, error: dayInsertError } = await admin
        .from("fitness_plan_days")
        .insert({
          plan_id: planId,
          week_number: week.week,
          day_number: dayNumber,
          title: day.session_type,
          day_category: deriveDayCategory(day.session_type, isRest),
          target_muscles: targetMuscles,
          duration_minutes: day.duration_minutes || 0,
          is_rest: false,
        })
        .select("id")
        .single();

      if (dayInsertError || !insertedDay?.id) {
        console.error(
          "[fitness-generate] fitness_plan_days insert error:",
          dayInsertError?.message,
        );
        continue;
      }

      (day.exercises || []).forEach((ex: any, orderIdx: number) => {
        const dbEx: any = exerciseMap.get(ex.id || "");
        if (!dbEx) {
          console.warn(
            `[fitness-generate] Skipping hallucinated exercise id: ${ex.id}`,
          );
          return;
        }
        planExerciseRows.push({
          plan_id: planId,
          plan_day_id: insertedDay.id,
          exercise_id: dbEx.id,
          order_index: orderIdx,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          rest_seconds: ex.rest_seconds ?? null,
          notes: ex.coach_notes ?? null,
        });
      });
    }
  }

  if (planExerciseRows.length > 0) {
    const { error: exercisesInsertError } = await admin
      .from("fitness_plan_exercises")
      .insert(planExerciseRows);

    if (exercisesInsertError) {
      console.error(
        "[fitness-generate] fitness_plan_exercises bulk insert error:",
        exercisesInsertError.message,
      );
    }
  }

  return {
    planId,
    selection_hash,
    cached: false,
  };
}
