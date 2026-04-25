import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FitnessWorkoutPlan } from "@/types/fitness";

/**
 * POST /api/fitness/generate
 *
 * Orchestrates the fitness workout generation flow:
 * 1. Verifies the user session via BetterAuth (supports Bearer tokens from mobile).
 * 2. Persists/Upserts the user's raw selections into `fitness_onboarding_selections`.
 * 3. Checks the cache (`fitness_generated_workouts`) for an existing plan with the same `selection_hash`.
 * 4. If not found, calls Gemini 1.5 Flash to generate a plan based on the selections.
 * 5. Saves the new workout to the cache and returns it.
 */
export async function POST(req: NextRequest) {
  // BetterAuth session validation
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => null);

  if (!body || !body.selections || !body.selection_hash) {
    return NextResponse.json(
      { error: "Missing selections or selection_hash in request body" },
      { status: 400 },
    );
  }

  const { selections, selection_hash } = body;
  const admin = getSupabaseAdmin();

  // 1. Persistence: Save/Upsert selections into fitness_onboarding_selections
  // This marks the user as "onboarded" or updates their existing selections.
  const { error: upsertError } = await admin
    .from("fitness_onboarding_selections")
    .upsert(
      {
        user_id: userId,
        ...selections,
        selection_hash,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    console.error("[fitness-generate] Persistence error:", upsertError.message);
    // We continue even if persistence fails, but log the error.
  }

  // 2. Cache Check: Query fitness_generated_workouts for the selection_hash
  const { data: cachedWorkout, error: cacheError } = await admin
    .from("fitness_generated_workouts")
    .select("workout_plan")
    .eq("selection_hash", selection_hash)
    .maybeSingle();

  if (cacheError) {
    console.error("[fitness-generate] Cache query error:", cacheError.message);
  }

  if (cachedWorkout?.workout_plan) {
    return NextResponse.json({
      workout_plan: cachedWorkout.workout_plan,
      selection_hash,
      cached: true,
    });
  }

  // 3. AI Generation (Conditional): Call Gemini if no cached workout exists
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error(
      "[fitness-generate] GEMINI_API_KEY is missing in environment variables.",
    );
    return NextResponse.json(
      { error: "Server configuration error: Gemini API key missing" },
      { status: 500 },
    );
  }

  const systemPrompt = `
You are an expert fitness coach. Generate a personalized workout plan in JSON format.
The output MUST strictly match the FitnessWorkoutPlan interface.
Return ONLY the raw JSON object. No markdown, no backticks, no explanations.

Interface:
export interface FitnessExercise {
  name: string;
  sets?: number;
  reps?: string;     // e.g., "8-12", "30 seconds", "To failure"
  rest_seconds?: number;
  description: string;
  muscles_targeted: string[];
}

export interface FitnessDay {
  day: string;           // "Monday" ... "Sunday"
  session_type: string;  // e.g., "Strength", "HIIT", "Rest", "Cardio"
  duration_minutes: number;
  exercises: FitnessExercise[];
}

export interface FitnessWeek {
  week: number;
  days: FitnessDay[];
}

export interface FitnessWorkoutPlan {
  title: string;
  summary: string;
  duration_weeks: number;
  days_per_week: number;
  weekly_schedule: FitnessWeek[];
}
`;

  const userPrompt = `
User Profile:
${JSON.stringify(selections, null, 2)}

Generate a ${selections.days_per_week} day per week plan for ${selections.workout_duration || 4} weeks (return week 1 as a template if duration is long, but strictly follow duration_weeks).
Focus areas: ${selections.focus_areas?.join(", ")}.
Equipment: ${selections.equipment?.join(", ")}.
Goal: ${selections.goal}.
Experience Level: ${selections.level}.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt + " " + userPrompt }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "[fitness-generate] Gemini API error:",
        JSON.stringify(errorData),
      );
      return NextResponse.json(
        { error: "Failed to generate workout plan from AI" },
        { status: 500 },
      );
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("Gemini returned an empty response");
    }

    let workoutPlan: FitnessWorkoutPlan;
    try {
      workoutPlan = JSON.parse(generatedText);
    } catch (parseError) {
      console.error(
        "[fitness-generate] JSON Parse Error. Raw Text:",
        generatedText,
      );
      return NextResponse.json(
        { error: "AI returned invalid JSON structure" },
        { status: 500 },
      );
    }

    // 4. Save the generated workout to the cache
    const { error: insertError } = await admin
      .from("fitness_generated_workouts")
      .insert({
        selection_hash,
        workout_plan: workoutPlan,
        generated_by: "gemini-1.5-flash",
      });

    if (insertError) {
      console.error(
        "[fitness-generate] Error caching workout plan:",
        insertError.message,
      );
    }

    // 5. Return the response
    return NextResponse.json({
      workout_plan: workoutPlan,
      selection_hash,
      cached: false,
    });
  } catch (error: any) {
    console.error("[fitness-generate] Unexpected error:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
