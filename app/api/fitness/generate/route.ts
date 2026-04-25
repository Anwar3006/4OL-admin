import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FitnessWorkoutPlan } from "@/types/fitness";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 1. Define the JSON schema for the SDK (Guarantees valid output)
const workoutSchema = {
  description: "Personalized fitness workout plan",
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    duration_weeks: { type: SchemaType.NUMBER },
    days_per_week: { type: SchemaType.NUMBER },
    weekly_schedule: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          days: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day: { type: SchemaType.STRING },
                session_type: { type: SchemaType.STRING },
                duration_minutes: { type: SchemaType.NUMBER },
                exercises: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      name: { type: SchemaType.STRING },
                      sets: { type: SchemaType.NUMBER },
                      reps: { type: SchemaType.STRING },
                      rest_seconds: { type: SchemaType.NUMBER },
                      description: { type: SchemaType.STRING },
                      muscles_targeted: { 
                        type: SchemaType.ARRAY, 
                        items: { type: SchemaType.STRING } 
                      },
                    },
                    required: ["name", "description", "muscles_targeted"],
                  },
                },
              },
              required: ["day", "session_type", "exercises"],
            },
          },
        },
        required: ["week", "days"],
      },
    },
  },
  required: ["title", "summary", "weekly_schedule"],
};

function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => null);

  if (!body || !body.selections || !body.selection_hash) {
    return NextResponse.json({ error: "Missing selections or hash" }, { status: 400 });
  }

  const { selections, selection_hash } = body;
  const admin = getSupabaseAdmin();

  // 1. Fetch User Profile for Gender and Age
  const { data: profile } = await admin
    .from("user_profiles")
    .select("gender, birthday")
    .eq("user_id", userId)
    .maybeSingle();

  const userAge = calculateAge(profile?.birthday);
  const userGender = profile?.gender;

  // Enrich selections for persistence (optional, but requested to remove from onboarding)
  // We'll exclude gender from the fitness_onboarding_selections table upsert 
  // because the column doesn't exist yet, as per user's error report.
  // We'll only upsert what's in the table.
  
  const { gender, age, ...persistentSelections } = selections;

  // Persistence & Cache Check
  const { error: upsertError } = await admin.from("fitness_onboarding_selections").upsert({
    user_id: userId,
    ...persistentSelections,
    selection_hash,
  }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("[fitness-generate] Persistence error:", upsertError.message);
  }

  const { data: cachedWorkout } = await admin
    .from("fitness_generated_workouts")
    .select("workout_plan")
    .eq("selection_hash", selection_hash)
    .maybeSingle();

  if (cachedWorkout?.workout_plan) {
    return NextResponse.json({
      workout_plan: cachedWorkout.workout_plan,
      selection_hash,
      cached: true,
    });
  }

  // 2. Initialize Gemini SDK
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  // Use gemini-1.5-flash specifically
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: workoutSchema as any, // Forces AI to follow your interface
    },
  });

  const fullProfile = {
    ...selections,
    gender: userGender || selections.gender,
    age: userAge || selections.age,
  };

  // workout_duration is MINUTES per session (20, 30, 45, 60, 90), NOT weeks.
  // The plan always covers 2 weeks of programming.
  const sessionMinutes = selections.workout_duration ?? 45;
  const daysPerWeek = selections.workout_frequency ?? 3;

  const userPrompt = `
Generate a 2-week personalized fitness workout plan with the following constraints:

- Primary Goal: ${selections.fitness_goal?.replace(/_/g, ' ')}
- Fitness Level: ${selections.fitness_level}
- Training Frequency: ${daysPerWeek} days per week
- Session Duration: ${sessionMinutes} minutes per session
- Equipment Available: ${selections.equipment?.join(', ') || 'bodyweight only'}
- Focus Areas: ${selections.focus_areas?.join(', ') || 'full body'}
${fullProfile.gender ? `- Gender: ${fullProfile.gender}` : ''}
${fullProfile.age ? `- Age: ${fullProfile.age} years` : ''}
${selections.weight_kg ? `- Weight: ${selections.weight_kg} kg` : ''}
${selections.height_cm ? `- Height: ${selections.height_cm} cm` : ''}

IMPORTANT RULES:
1. Return exactly 2 weeks. Week 2 must show progression (more reps/sets/load) over Week 1.
2. Each week must contain ALL 7 days. Rest days get session_type: "Rest", duration_minutes: 0, exercises: [].
3. Active training days must have approximately ${Math.round(sessionMinutes / 8)} exercises to fill the ${sessionMinutes}-minute session.
4. EQUIPMENT CONSTRAINT IS ABSOLUTE. If equipment is bodyweight_only, use zero weighted exercises.
5. Every exercise needs: sets (number), reps (string like "10-12" or "30 seconds"), rest_seconds (integer), a 1-2 sentence description with form cues, and muscles_targeted (array).
6. Match difficulty strictly to the ${selections.fitness_level} fitness level.
7. The title must be specific and motivating (e.g. "8-Week Lean Body Blueprint", not just "Workout Plan").
  `.trim();

  try {
    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const workoutPlan = JSON.parse(response.text()) as FitnessWorkoutPlan;

    // 3. Save to Cache
    await admin.from("fitness_generated_workouts").insert({
      selection_hash,
      workout_plan: workoutPlan,
      generated_by: "gemini-1.5-flash-sdk",
    });

    return NextResponse.json({
      workout_plan: workoutPlan,
      selection_hash,
      cached: false,
    });

  } catch (error: any) {
    console.error("[fitness-generate] Gemini SDK error:", error);
    return NextResponse.json({ error: "AI Generation failed" }, { status: 500 });
  }
}
