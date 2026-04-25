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
                      id: { type: SchemaType.STRING },
                      name: { type: SchemaType.STRING },
                      sets: { type: SchemaType.NUMBER },
                      reps: { type: SchemaType.STRING },
                      rest_seconds: { type: SchemaType.NUMBER },
                      description: { type: SchemaType.STRING },
                      muscles_targeted: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                      },
                      video_url: { type: SchemaType.STRING },
                      thumbnail_urls: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                      },
                    },
                    required: ["id", "name", "description", "muscles_targeted"],
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

const BODY_PARTS = [
  "Arm", "Back", "Biceps", "Chest", "Chest and Triceps", "Glutes", 
  "Hamstring", "Legs", "Quadriceps", "Rectus Abdominus Muscle", "Shoulder", "Triceps"
];

const bodyPartMap: Record<string, string[]> = {
  fullBody: BODY_PARTS,
  upperBody: ["Arm", "Back", "Biceps", "Chest", "Chest and Triceps", "Shoulder", "Triceps"],
  lowerBody: ["Glutes", "Hamstring", "Legs", "Quadriceps"],
  core: ["Rectus Abdominus Muscle"],
  cardio: [] 
};

const equipmentMap: Record<string, string[]> = {
  bodyweight_only: ["No Equipment", "Yoga/ Exercise Mat"],
  dumbbells: ["Dumbbell", "No Equipment", "Yoga/ Exercise Mat"],
  resistance_bands: ["Resistance Band", "No Equipment", "Yoga/ Exercise Mat"],
  full_gym: [
    "No Equipment", "Barbell", "Dumbbell", "Kettlebell", "Gym Machine Workout", 
    "Resistance Band", "Treadmill", "Exercise Bike", "Yoga/ Exercise Mat", 
    "Skipping Ropes", "Exercise Balls", "Weight Bench", "Pull up bar"
  ]
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
    return NextResponse.json(
      { error: "Missing selections or hash" },
      { status: 400 },
    );
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
  const { error: upsertError } = await admin
    .from("fitness_onboarding_selections")
    .upsert(
      {
        user_id: userId,
        ...persistentSelections,
        selection_hash,
      },
      { onConflict: "user_id" },
    );

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
  const geminiApiKey = process.env.GEMINI_API_KEY;
  // Pull model from env, fallback to flash if not provided
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash";

  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Gemini API key missing" },
      { status: 500 },
    );
  }

  // 3. Fetch Relevant Workouts from Database
  const allowedBodyParts = selections.focus_areas?.flatMap((area: string) => bodyPartMap[area] || []) || [];
  const allowedEquipment = selections.equipment?.flatMap((eq: string) => equipmentMap[eq] || []) || equipmentMap.bodyweight_only;

  // Distinct values
  const uniqueBodyParts = [...new Set(allowedBodyParts)];
  const uniqueEquipment = [...new Set(allowedEquipment)];

  let workoutQuery = admin
    .from("workouts")
    .select("id, exercise_name, primary_body_part, secondary_body_part, equipment_type, video_url, thumbnail_urls, how_to")
    .eq("is_active", true);

  if (uniqueEquipment.length > 0) {
    workoutQuery = workoutQuery.in("equipment_type", uniqueEquipment);
  }
  
  if (uniqueBodyParts.length > 0 && !selections.focus_areas?.includes("fullBody")) {
    workoutQuery = workoutQuery.or(`primary_body_part.in.(${uniqueBodyParts.join(",")}),secondary_body_part.in.(${uniqueBodyParts.join(",")})`);
  }

  const { data: dbWorkouts, error: dbError } = await workoutQuery;

  if (dbError) {
    console.error("[fitness-generate] DB Fetch error:", dbError.message);
  }

  if (!dbWorkouts || dbWorkouts.length === 0) {
    return NextResponse.json({
      workout_plan: null,
      message: "No workouts match your current preferences. Try adjusting your focus areas or equipment.",
    });
  }

  // Format database workouts for the prompt
  const availableWorkoutsContext = dbWorkouts.map(w => ({
    id: w.id,
    name: w.exercise_name,
    muscles_targeted: [w.primary_body_part, w.secondary_body_part].filter(Boolean),
    equipment: w.equipment_type,
    video_url: w.video_url,
    thumbnail_urls: w.thumbnail_urls,
    how_to: w.how_to
  }));

  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: workoutSchema as any,
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
Generate a 2-week personalized fitness workout plan using ONLY the provided exercises from our library.

LIBRARY OF AVAILABLE EXERCISES:
${JSON.stringify(availableWorkoutsContext)}

USER PROFILE & CONSTRAINTS:
- Primary Goal: ${selections.fitness_goal?.replace(/_/g, " ")}
- Fitness Level: ${selections.fitness_level}
- Training Frequency: ${daysPerWeek} days per week
- Session Duration: ${sessionMinutes} minutes per session
- Equipment Available: ${selections.equipment?.join(", ") || "bodyweight only"}
- Focus Areas: ${selections.focus_areas?.join(", ") || "full body"}
${fullProfile.gender ? `- Gender: ${fullProfile.gender}` : ""}
${fullProfile.age ? `- Age: ${fullProfile.age} years` : ""}
${selections.weight_kg ? `- Weight: ${selections.weight_kg} kg` : ""}
${selections.height_cm ? `- Height: ${selections.height_cm} cm` : ""}

IMPORTANT RULES:
1. MANDATORY: You must select exercises EXCLUSIVELY from the LIBRARY list provided above. Use their "id", "name", "video_url", and "thumbnail_urls" exactly.
2. Return exactly 2 weeks. Week 2 should show slight progression (volume/intensity) over Week 1.
3. Each week must contain ALL 7 days. Rest days get session_type: "Rest", duration_minutes: 0, exercises: [].
4. Active training days must have approximately ${Math.round(sessionMinutes / 8)} exercises from the library.
5. Match the difficulty and selection to the user's ${selections.fitness_level} level and ${selections.fitness_goal} goal.
6. For each exercise, provide: sets (number), reps (string like "10-12" or "30 seconds"), rest_seconds (integer), and a 1-2 sentence description (use the "how_to" info if available).
7. If only one workout in the library fits a specific need, use it. If multiple fit, choose the best matching one.
8. If the library is too small to fill the plan, repeat exercises across different days but ensure variety within a session.
  `.trim();

  try {
    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const workoutPlan = JSON.parse(response.text()) as FitnessWorkoutPlan;
    
    // 3. Hydrate exercises with full data from DB
    const workoutMap = new Map(dbWorkouts.map(w => [w.id, w]));
    workoutPlan.weekly_schedule.forEach(week => {
      week.days.forEach(day => {
        day.exercises = day.exercises.map(ex => {
          const dbEx = workoutMap.get(ex.id || "");
          if (dbEx) {
            return {
              ...ex,
              name: dbEx.exercise_name, // Ensure canonical name
              video_url: dbEx.video_url,
              thumbnail_urls: dbEx.thumbnail_urls,
              how_to: dbEx.how_to,
              muscles_targeted: [dbEx.primary_body_part, dbEx.secondary_body_part].filter(Boolean),
            };
          }
          return ex;
        });
      });
    });

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
    return NextResponse.json(
      { error: "AI Generation failed" },
      { status: 500 },
    );
  }
}
