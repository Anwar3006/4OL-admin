import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 1. Upgraded Schema (Aligned with the new DB fields)
const fitnessPlanSchema = {
  description: "A world-class, periodized personalized fitness plan",
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING, description: "A highly motivating overview of the plan's methodology." },
    duration_weeks: { type: SchemaType.NUMBER },
    days_per_week: { type: SchemaType.NUMBER },
    weekly_schedule: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          focus: { type: SchemaType.STRING, description: "The overarching goal of this specific week (e.g., 'Hypertrophy Baseline', 'Strength Overload')." },
          days: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day_name: { type: SchemaType.STRING, description: "e.g., 'Monday', 'Tuesday', or 'Day 1'" },
                session_type: { type: SchemaType.STRING, description: "e.g., 'Upper Body Push', 'Active Recovery', 'Full Body HIIT', 'Rest'" },
                duration_minutes: { type: SchemaType.NUMBER },
                exercises: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      id: { type: SchemaType.STRING, description: "The exact UUID from the provided library." },
                      name: { type: SchemaType.STRING },
                      sets: { type: SchemaType.NUMBER },
                      reps: { type: SchemaType.STRING, description: "e.g., '8-10', 'To Failure', '30 sec'" },
                      rest_seconds: { type: SchemaType.NUMBER },
                      coach_notes: { type: SchemaType.STRING, description: "Pro tip for biomechanics, breathing, or intent." },
                      muscles_targeted: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    },
                    required: ["id", "name", "sets", "reps", "rest_seconds", "coach_notes"],
                  },
                },
              },
              required: ["day_name", "session_type", "duration_minutes", "exercises"],
            },
          },
        },
        required: ["week", "days"],
      },
    },
  },
  required: ["title", "summary", "duration_weeks", "days_per_week", "weekly_schedule"],
};

// Aligning your app selections to DB strings
const equipmentMap: Record<string, string[]> = {
  bodyweight_only: ["No Equipment", "Yoga/ Exercise Mat"],
  dumbbells: ["Dumbbell", "No Equipment", "Yoga/ Exercise Mat"],
  resistance_bands: ["Resistance Band", "No Equipment", "Yoga/ Exercise Mat"],
  full_gym: ["No Equipment", "Barbell", "Dumbbell", "Kettlebell", "Gym Machine Workout", "Resistance Band", "Treadmill", "Exercise Bike", "Yoga/ Exercise Mat", "Skipping Ropes", "Exercise Balls", "Weight Bench", "Pull up bar"],
};

function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const body = await req.json().catch(() => null);

  if (!body?.selections || !body?.selection_hash) {
    return NextResponse.json({ error: "Missing selections or hash" }, { status: 400 });
  }

  const { selections, selection_hash } = body;

  // Profile Enrichment
  const { data: profile } = await admin
    .from("user_profiles")
    .select("sex, dob")
    .eq("user_id", userId)
    .maybeSingle();

  const userAge = calculateAge(profile?.dob ?? null);
  const userGender = profile?.sex;

  // Persist Data based on the new Schema
  const { gender: _g, age: _a, ...persistentSelections } = selections;
  await admin
    .from("fitness_onboarding_selections")
    .upsert({ user_id: userId, ...persistentSelections, selection_hash }, { onConflict: "user_id" })
    .then(({ error }) => {
      if (error) console.error("[fitness-generate] Persistence error:", error.message);
    });

  // Cache Check
  const { data: cachedPlan } = await admin
    .from("fitness_generated_workouts")
    .select("workout_plan")
    .eq("selection_hash", selection_hash)
    .maybeSingle();

  if (cachedPlan?.workout_plan) {
    return NextResponse.json({ workout_plan: cachedPlan.workout_plan, selection_hash, cached: true });
  }

  // 2. Upgraded to optimal 2026 Model: Gemini 3.5 Flash
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

  if (!geminiApiKey) {
    return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });
  }

  // 3. Dynamic Database Query utilizing new Table fields
  const allowedEquipment = selections.equipment?.flatMap((eq: string) => equipmentMap[eq] || []) || equipmentMap.bodyweight_only;
  const uniqueEquipment = [...new Set(allowedEquipment)];

  let exerciseQuery = admin
    .from("fitness_exercises")
    .select("id, exercise_name, category, primary_muscle_group, secondary_muscles, equipment_required, difficulty_level, default_sets, default_reps_duration, rest_time_seconds, description, video_url, thumbnail_url")
    .eq("is_active", true)
    .eq("status", "published");

  if (uniqueEquipment.length > 0 && !selections.equipment?.includes("full_gym")) {
    exerciseQuery = exerciseQuery.in("equipment_required", uniqueEquipment as string[]);
  }

  const { data: dbExercises, error: dbError } = await exerciseQuery;
  if (dbError) console.error("[fitness-generate] DB fetch error:", dbError.message);

  if (!dbExercises || dbExercises.length === 0) {
    return NextResponse.json({ workout_plan: null, message: "No exercises match your preferences. Try adjusting your equipment or locations." });
  }

  // Context map for the LLM
  const availableExercisesContext = dbExercises.map(e => ({
    id: e.id,
    name: e.exercise_name,
    category: e.category,
    primary_muscle: e.primary_muscle_group,
    secondary_muscles: e.secondary_muscles,
    equipment: e.equipment_required,
    difficulty: e.difficulty_level,
  }));

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", responseSchema: fitnessPlanSchema as any },
  });

  // Calculate Dynamic Variables
  const fullProfile = { ...selections, gender: userGender || selections.gender, age: userAge || selections.age };
  const workoutWeeks = selections.workout_weeks || 2;
  const sessionMinutes = selections.workout_duration || 45;
  const workoutDaysList = selections.workout_days?.length > 0 ? selections.workout_days.join(", ") : "3 days per week";
  const targetDaysCount = selections.workout_days?.length || 3;

  // 4. World-Class Elite Coach Prompt
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
- Age: ${fullProfile.age ? `${fullProfile.age} years` : "Unknown"} | Gender: ${fullProfile.gender || "Unknown"}

== RULES & CONSTRAINTS ==
1. NO HALLUCINATIONS: You MUST strictly select exercises from the provided JSON library below. Use the exact "id" and "name". 
2. PERIODIZATION & PROGRESSIVE OVERLOAD: The plan MUST exactly span ${workoutWeeks} weeks. Subsequent weeks must demonstrate progressive overload (e.g., adding a set, increasing rep range, or decreasing rest time).
3. SCHEDULE MAPPING: You must provide exactly 7 days for every week. Assign the active workouts to the exact days listed in the user's Weekly Schedule (${workoutDaysList}). All other days must be labeled as "Rest" or "Active Recovery" with 0 duration and empty exercise arrays.
4. PACING: Active days should have an appropriate number of exercises to realistically fit into a ${sessionMinutes}-minute window (approx. ${Math.max(4, Math.round(sessionMinutes / 8))} exercises).
5. COACHING: Provide high-value, specific "coach_notes" for each exercise (e.g., "Drive through the heels", "Keep eccentric phase to 3 seconds").

== LIBRARY OF AVAILABLE EXERCISES ==
${JSON.stringify(availableExercisesContext)}
  `.trim();

  try {
    const result = await model.generateContent(userPrompt);
    const fitnessPlan = JSON.parse(result.response.text()) as any;

    // 5. Hydrate generated output with full DB media & details
    const exerciseMap = new Map(dbExercises.map(e => [e.id, e]));
    
    fitnessPlan.weekly_schedule.forEach((week: any) => {
      week.days.forEach((day: any) => {
        day.exercises = day.exercises.map((ex: any) => {
          const dbEx = exerciseMap.get(ex.id || "");
          if (dbEx) {
            return {
              ...ex,
              name: dbEx.exercise_name, // Override with DB exact name
              video_url: dbEx.video_url,
              thumbnail_url: dbEx.thumbnail_url, // Adjusted to singular
              muscles_targeted: [dbEx.primary_muscle_group, dbEx.secondary_muscles].filter(Boolean),
            };
          }
          return ex;
        });
      });
    });

    // Save generated workout
    await admin.from("fitness_generated_workouts").insert({
      selection_hash, 
      workout_plan: fitnessPlan, 
      generated_by: modelName // Will record gemini-2.5-flash
    });

    return NextResponse.json({ workout_plan: fitnessPlan, selection_hash, cached: false });
  } catch (error: any) {
    console.error("[fitness-generate] Gemini error:", error);
    return NextResponse.json({ error: "AI Generation failed" }, { status: 500 });
  }
}