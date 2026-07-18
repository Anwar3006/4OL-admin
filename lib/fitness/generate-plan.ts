import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// ─── Gemini Schema ────────────────────────────────────────────────────────────

export const fitnessPlanSchema = {
  description: "A world-class, periodized personalized fitness plan",
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: {
      type: SchemaType.STRING,
      description: "A highly motivating overview of the plan's methodology.",
    },
    duration_weeks: { type: SchemaType.NUMBER },
    days_per_week: { type: SchemaType.NUMBER },
    weekly_schedule: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          focus: {
            type: SchemaType.STRING,
            description: "The overarching goal of this specific week.",
          },
          days: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day_name: {
                  type: SchemaType.STRING,
                  description: "e.g., 'Monday', 'Tuesday', or 'Day 1'",
                },
                session_type: {
                  type: SchemaType.STRING,
                  description:
                    "e.g., 'Upper Body Push', 'Active Recovery', 'Rest'",
                },
                duration_minutes: { type: SchemaType.NUMBER },
                exercises: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      id: {
                        type: SchemaType.STRING,
                        description:
                          "The exact UUID from the provided library.",
                      },
                      name: { type: SchemaType.STRING },
                      sets: { type: SchemaType.NUMBER },
                      reps: {
                        type: SchemaType.STRING,
                        description: "e.g., '8-10', 'To Failure', '30 sec'",
                      },
                      rest_seconds: { type: SchemaType.NUMBER },
                      coach_notes: {
                        type: SchemaType.STRING,
                        description:
                          "Pro tip for biomechanics, breathing, or intent.",
                      },
                      met_value: {
                        type: SchemaType.NUMBER,
                        description: "The MET value provided in the library.",
                      },
                      muscles_targeted: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
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
                    ],
                  },
                },
              },
              required: [
                "day_name",
                "session_type",
                "duration_minutes",
                "exercises",
              ],
            },
          },
        },
        required: ["week", "days"],
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
};

// ─── Equipment Mapping ────────────────────────────────────────────────────────

// Maps the mobile onboarding `equipment_access` single-choice value to the
// `equipment_required` strings stored on fitness_exercises. Mobile users never
// set a granular `equipment` array; they only pick one of these three access
// levels, so exercise filtering must derive allowed gear from that value.
export const equipmentAccessMap: Record<string, string[]> = {
  no_equipment: ["No Equipment", "Yoga/ Exercise Mat"],
  basic: ["No Equipment", "Yoga/ Exercise Mat", "Dumbbell", "Resistance Band"],
  full_gym: [
    "No Equipment",
    "Yoga/ Exercise Mat",
    "Dumbbell",
    "Resistance Band",
    "Barbell",
    "Kettlebell",
    "Gym Machine Workout",
    "Treadmill",
    "Exercise Bike",
    "Skipping Ropes",
    "Exercise Balls",
    "Weight Bench",
    "Pull up bar",
  ],
};

// Kept for backwards compatibility with any callers still passing the legacy
// `equipment` array. Prefer `equipmentAccessMap` for new code.
export const equipmentMap: Record<string, string[]> = {
  bodyweight_only: equipmentAccessMap.no_equipment,
  dumbbells: ["Dumbbell", "No Equipment", "Yoga/ Exercise Mat"],
  resistance_bands: ["Resistance Band", "No Equipment", "Yoga/ Exercise Mat"],
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
 * comparable, letting a real user's onboarding hash match an
 * admin-crafted plan and skip a redundant Gemini call.
 *
 * Do not import this from the mobile repo's path ("@/store/use-fitness-store")
 * — that alias resolves within the mobile app only and does not exist in
 * this repo; doing so throws a module-not-found error on every request.
 *
 * Health-specific fields (age, weight, height) are intentionally EXCLUDED
 * so body metrics don't prevent cache hits for users with identical
 * workout preferences — also why the admin form never collects them.
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
}

export interface GenerationResult {
  planId: string | null;
  selection_hash: string;
  cached: boolean;
  error?: string;
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
  const { selections, selection_hash, authorId, authorType } = options;
  const admin = getSupabaseAdmin();

  // ── Cache check ──
  const { data: cachedPlan } = await admin
    .from("fitness_plans")
    .select("id")
    .eq("selection_hash", selection_hash)
    .maybeSingle();

  if (cachedPlan?.id) {
    return {
      planId: cachedPlan.id,
      selection_hash,
      cached: true,
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

  if (!geminiApiKey) {
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "Gemini API key missing",
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

  // ── Call Gemini AI ──
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: fitnessPlanSchema as any,
    },
  });

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

== LIBRARY OF AVAILABLE EXERCISES ==
${JSON.stringify(availableExercisesContext)}
  `.trim();

  // ── Retry Logic (Exponential Backoff) ──
  let result;
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      result = await model.generateContent(userPrompt);
      break; // Success!
    } catch (error: any) {
      console.warn(
        `[fitness-generate] Gemini attempt ${attempt} failed:`,
        error.message,
      );

      if (attempt === MAX_RETRIES) {
        console.error(
          "[fitness-generate] All Gemini retry attempts exhausted.",
        );
        return {
          planId: null,
          selection_hash,
          cached: false,
          error:
            "AI Generation is currently experiencing high demand. Please try again in a moment.",
        };
      }

      const delay = BASE_DELAY_MS * attempt;
      console.log(`[fitness-generate] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!result) {
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "AI Generation failed unexpectedly.",
    };
  }

  // ── Parse AI Response ──
  let fitnessPlan: any;
  try {
    fitnessPlan = JSON.parse(result.response.text());
  } catch (error: any) {
    console.error("[fitness-generate] JSON Parsing error:", error);
    return {
      planId: null,
      selection_hash,
      cached: false,
      error: "Failed to process the AI response.",
    };
  }

  const exerciseMap = new Map(dbExercises.map((e: any) => [e.id, e]));

  // ── Insert fitness_plans row ──
  const styleTag = deriveStyleTag(selections);
  const { data: insertedPlan, error: planInsertError } = await admin
    .from("fitness_plans")
    .insert({
      title: fitnessPlan.title,
      summary: fitnessPlan.summary,
      description: fitnessPlan.summary,
      difficulty_level: selections.fitness_level,
      duration_weeks: fitnessPlan.duration_weeks,
      days_per_week: fitnessPlan.days_per_week,
      workouts_per_week: targetDaysCount,
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
  const planExerciseRows: any[] = [];

  for (const week of fitnessPlan.weekly_schedule as any[]) {
    for (const [dayIdx, day] of (week.days as any[]).entries()) {
      const dayNumber = dayIdx + 1;
      const isRest =
        day.session_type === "Rest" ||
        !day.exercises ||
        day.exercises.length === 0;

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
          is_rest: isRest,
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
          week_number: week.week,
          day_number: dayNumber,
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
